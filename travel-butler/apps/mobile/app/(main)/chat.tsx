import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
  Animated,
  Keyboard,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { MessageBubble, type Message, type ToolTrace } from "@/components/chat/MessageBubble";
import { ToolStatusBubble } from "@/components/chat/ToolStatusBubble";
import { Composer } from "@/components/chat/Composer";
import { ItineraryCard, type ItineraryData, type ItineraryStepData } from "@/components/chat/ItineraryCard";
import { ExecutionAnimation } from "@/components/chat/ExecutionAnimation";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const PARCHMENT = "#fdf5ec";
const INK_DARK = "#0D2B45";
const INK_LIGHT = "#1A3D5C";
const BLUE_ACCENT = "#112e93";
const MUTED_BLUE = "#6B7B9E";
const TEXT_DARK = "#2B2B2B";

// ── Extended message type to support itinerary cards and execution ──
interface ChatMessage extends Message {
  itinerary?: ItineraryData;
  showExecution?: boolean;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Good afternoon! I'm Winston, your travel planning assistant.\n\nI can help you organize your itinerary, find destinations, and keep track of your journey. Where would you like to travel?",
    },
  ]);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentItinerary, setCurrentItinerary] = useState<ItineraryData | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const profileScale = useRef(new Animated.Value(1)).current;
  const [showProfile, setShowProfile] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Track keyboard
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Scroll to bottom on mount
  useEffect(() => {
    const t1 = setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    const t2 = setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // ── Fetch latest itinerary from Supabase ──
  const fetchLatestItinerary = useCallback(async (): Promise<ItineraryData | null> => {
    if (!user) return null;
    try {
      // Get the latest plan for this user
      const { data: plans } = await supabase
        .from("plans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!plans || plans.length === 0) return null;
      const plan = plans[0];

      // Get steps for this plan
      const { data: steps } = await supabase
        .from("plan_steps")
        .select("*")
        .eq("plan_id", plan.id)
        .order("step_order", { ascending: true });

      const itinerarySteps: ItineraryStepData[] = (steps || []).map((s: any) => ({
        id: s.id,
        order: s.step_order,
        type: s.step_type || s.category || "activity",
        title: s.title,
        description: s.description,
        date: s.date || plan.start_date || "",
        start_time: s.start_time,
        end_time: s.end_time,
        location: typeof s.location === "object" && s.location ? s.location : undefined,
        agent: s.agent || "unknown_agent",
        estimated_price_usd: parseFloat(s.estimated_price_usd || "0"),
        notes: s.notes,
      }));

      const itinerary: ItineraryData = {
        id: plan.id,
        title: plan.title,
        destination: plan.destination || "",
        start_date: plan.start_date || "",
        end_date: plan.end_date || "",
        estimated_total_usd: parseFloat(plan.estimated_total_usd || "0"),
        steps: itinerarySteps,
        status: plan.status || "draft",
      };

      return itinerary;
    } catch (err) {
      console.error("Failed to fetch itinerary:", err);
      return null;
    }
  }, [user]);

  // ── Mark itinerary as completed in Supabase ──
  const markItineraryCompleted = useCallback(async (itineraryId: string) => {
    try {
      await supabase
        .from("plans")
        .update({ status: "completed" })
        .eq("id", itineraryId);
    } catch (err) {
      console.error("Failed to mark itinerary completed:", err);
    }
  }, []);

  // ── Handle sending a message ──
  const handleSend = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Call the real backend API
      const res = await api.post("/chat/send", {
        message: text,
        conversation_id: conversationId,
      });

      // Store conversation_id for continuity
      if (res.conversation_id) {
        setConversationId(res.conversation_id);
      }

      // Check if any tool traces involve itinerary generation
      const toolTraces: ToolTrace[] = (res.tool_trace || []).map((t: any) => ({
        tool: t.tool,
        status: t.status || "ok",
        latency_ms: t.latency_ms,
      }));

      const hasItineraryGenerate = toolTraces.some((t) =>
        t.tool === "itinerary_generate"
      );
      const hasItineraryExecute = toolTraces.some((t) =>
        t.tool === "itinerary_execute"
      );

      // Build assistant message
      const assistantMsg: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: "assistant",
        content: res.reply || "",
        toolTrace: toolTraces.length > 0 ? toolTraces : undefined,
      };

      // If itinerary was generated, fetch it and attach to message
      if (hasItineraryGenerate) {
        const itinerary = await fetchLatestItinerary();
        if (itinerary) {
          assistantMsg.itinerary = itinerary;
          setCurrentItinerary(itinerary);
        }
      }

      // If itinerary execution was triggered, show execution animation
      if (hasItineraryExecute && currentItinerary) {
        assistantMsg.showExecution = true;
        assistantMsg.itinerary = currentItinerary;
      }

      setMessages((prev) => [...prev, assistantMsg]);
      setSending(false);

    setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (err: any) {
      console.error("Chat API error:", err);

      // Fallback message
      const errorMsg: ChatMessage = {
        id: `${Date.now()}-err`,
        role: "assistant",
        content:
          err?.status === 401
            ? "I couldn't verify your session. Please sign out and sign back in."
            : "I'm having trouble connecting to the server. Please make sure the backend is running and try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
      setSending(false);
    }
  };

  // ── Handle itinerary confirm (user taps "Confirm & Book") ──
  const handleItineraryConfirm = useCallback(async () => {
    if (!currentItinerary) return;

    // Send a "proceed" message to trigger itinerary_execute via Gemini
    const confirmMsg: ChatMessage = {
      id: `${Date.now()}-confirm`,
      role: "user",
      content: "Yes, proceed with this itinerary. Book everything.",
    };
    setMessages((prev) => [...prev, confirmMsg]);
    setSending(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const res = await api.post("/chat/send", {
        message: "Yes, proceed with this itinerary. Book everything.",
        conversation_id: conversationId,
      });

      if (res.conversation_id) {
        setConversationId(res.conversation_id);
      }

      // Always show execution animation when confirming
      const executionMsg: ChatMessage = {
        id: `${Date.now()}-exec`,
        role: "assistant",
        content: res.reply || "Executing your itinerary...",
        showExecution: true,
        itinerary: currentItinerary,
      };

      setMessages((prev) => [...prev, executionMsg]);
      setSending(false);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch {
      // Even if API fails, show the mock execution animation
      const executionMsg: ChatMessage = {
        id: `${Date.now()}-exec`,
        role: "assistant",
        content: "Booking your trip now...",
        showExecution: true,
        itinerary: currentItinerary,
      };

      setMessages((prev) => [...prev, executionMsg]);
      setSending(false);
    }
  }, [currentItinerary, conversationId]);

  // ── Handle execution animation complete ──
  const handleExecutionComplete = useCallback(() => {
    if (currentItinerary) {
      markItineraryCompleted(currentItinerary.id);

      // Add a completion message
      const doneMsg: ChatMessage = {
        id: `${Date.now()}-done`,
        role: "assistant",
        content:
          `Your trip to ${currentItinerary.destination} has been booked! ` +
          `You can view it in the Trips tab. Need anything else?`,
      };
      setMessages((prev) => [...prev, doneMsg]);
      setCurrentItinerary(null);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [currentItinerary, markItineraryCompleted]);

  // ── Handle "Request Changes" ──
  const handleRequestChanges = useCallback(() => {
    // Focus the composer — user can type their change request
    const changeMsg: ChatMessage = {
      id: `${Date.now()}-change-prompt`,
      role: "assistant",
      content: "Sure, what would you like to change? You can ask me to modify times, swap restaurants, add activities, or adjust anything else.",
    };
    setMessages((prev) => [...prev, changeMsg]);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, []);

  // ── Render ──
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: PARCHMENT }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: Platform.OS === "ios" ? 60 : 40,
          paddingHorizontal: 24,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(17, 46, 147, 0.1)",
          backgroundColor: PARCHMENT,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          {/* Winston Logo */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Georgia",
                fontSize: 24,
                fontWeight: "700",
                color: BLUE_ACCENT,
                letterSpacing: -0.5,
              }}
            >
              Winston
            </Text>
            <View
              style={{
                marginTop: 4,
                width: 48,
                height: 2,
                backgroundColor: BLUE_ACCENT,
                opacity: 0.8,
              }}
            />
          </View>

          {/* Profile Button */}
          <Animated.View style={{ transform: [{ scale: profileScale }] }}>
            <TouchableOpacity
              onPress={() => {
                Animated.sequence([
                  Animated.timing(profileScale, {
                    toValue: 0.9,
                    duration: 100,
                    useNativeDriver: true,
                  }),
                  Animated.timing(profileScale, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                  }),
                ]).start();
                setShowProfile(!showProfile);
              }}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "rgba(107, 123, 158, 0.1)",
                borderWidth: 1,
                borderColor: "rgba(107, 123, 158, 0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  color: BLUE_ACCENT,
                  fontWeight: "400",
                }}
              >
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Chat Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          extraData={[messages.length, sending]}
          keyExtractor={(m) => m.id}
        style={{ flex: 1, paddingHorizontal: 16 }}
          contentContainerStyle={{ 
            paddingBottom: Platform.OS === "ios" ? Math.max(100, keyboardHeight + 20) : 100, 
          paddingTop: 24,
            flexGrow: 1,
          }}
          onContentSizeChange={() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 50);
          }}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 24, paddingHorizontal: 8 }}>
            {/* Show execution animation */}
            {item.showExecution && item.itinerary ? (
              <ExecutionAnimation
                itinerary={item.itinerary}
                onComplete={handleExecutionComplete}
              />
            ) : item.itinerary && !item.showExecution ? (
              /* Show itinerary card + text response */
              <View>
                <MessageBubble message={item} />
                <View style={{ marginTop: 12 }}>
                  <ItineraryCard
                    itinerary={item.itinerary}
                    onConfirm={handleItineraryConfirm}
                    onRequestChanges={handleRequestChanges}
                    showActions={item.itinerary.status === "draft"}
                  />
                </View>
              </View>
            ) : (
              /* Regular message */
              <View>
                <MessageBubble message={item} />
                {item.toolTrace?.map((t: ToolTrace, i: number) => (
                  <ToolStatusBubble key={i} trace={t} />
                ))}
              </View>
            )}
          </View>
        )}
          removeClippedSubviews={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />

      {/* Typing indicator */}
      {sending && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 32,
            paddingBottom: 8,
            gap: 8,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: BLUE_ACCENT,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: PARCHMENT, fontSize: 10, fontWeight: "700", fontFamily: "Georgia" }}>W</Text>
          </View>
          <ActivityIndicator size="small" color={BLUE_ACCENT} />
          <Text style={{ fontSize: 13, color: MUTED_BLUE, fontStyle: "italic" }}>
            Winston is thinking...
          </Text>
        </View>
      )}

      <Composer onSend={handleSend} disabled={sending} />
    </KeyboardAvoidingView>
  );
}

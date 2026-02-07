import { useState, useRef, useEffect } from "react";
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
  Animated,
  PanResponder,
  Keyboard,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { MessageBubble, type Message, type ToolTrace } from "@/components/chat/MessageBubble";
import { ToolStatusBubble } from "@/components/chat/ToolStatusBubble";
import { Composer } from "@/components/chat/Composer";
import { api } from "@/lib/api";

const PARCHMENT = "#fdf5ec";
const INK = "#202d8e";
const INK_DARK = "#0D2B45";
const INK_LIGHT = "#1A3D5C";
const BLUE_ACCENT = "#112e93";
const MUTED_BLUE = "#6B7B9E";
const TEXT_DARK = "#2B2B2B";

interface Itinerary {
  id: string;
  destination: string;
  dates: string;
  hotel: string;
  flight: string;
  status: string;
}

// Mock reply function for when backend isn't available
function mockReply(text: string): { reply: string; tool_trace: ToolTrace[] } {
  const lower = text.toLowerCase();
  if (lower.includes("flight") || lower.includes("fly")) {
    return {
      reply:
        "I found 3 flight options for you:\n  United UA 234 — $342\n  Delta DL 505 — $289\n  JetBlue B6 816 — $265\n\nWant me to book one?",
      tool_trace: [{ tool: "flight.search_offers", status: "ok", latency_ms: 120 }],
    };
  }
  if (lower.includes("hotel") || lower.includes("stay")) {
    return {
      reply:
        "Here are some hotels:\n  The Standard, High Line — $171/night\n  Pod 51 — $99/night\n  The NoMad Hotel — $245/night",
      tool_trace: [{ tool: "hotel.search", status: "ok", latency_ms: 95 }],
    };
  }
  if (lower.includes("dinner") || lower.includes("restaurant") || lower.includes("eat")) {
    return {
      reply:
        "Great taste! Here are some options:\n  Le Bernardin — French Seafood\n  Peter Luger — Steakhouse\n  Momofuku Noodle Bar — Asian Fusion",
      tool_trace: [{ tool: "dining.search", status: "ok", latency_ms: 88 }],
    };
  }
  return {
    reply:
      "I'm your Travel Butler! I can help with:\n  Flights — search & book\n  Hotels — find the best stays\n  Dining — restaurant reservations\n  Itineraries — layover & trip plans\n\nJust tell me what you need!",
    tool_trace: [],
  };
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Good afternoon! I'm Winston, your travel planning assistant.\n\nI can help you organize your itinerary, find destinations, and keep track of your journey. Where would you like to travel?",
    },
  ]);
  const [sending, setSending] = useState(false);
  const [showItineraries, setShowItineraries] = useState(false);
  const [itineraryView, setItineraryView] = useState<"present" | "future">("present");
  const [showProfile, setShowProfile] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const itineraryHeight = useRef(new Animated.Value(0)).current;
  const profileScale = useRef(new Animated.Value(1)).current;
  const itineraryScale = useRef(new Animated.Value(1)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Detect right swipe (swipe from left to right)
        return Math.abs(gestureState.dx) > 20 && gestureState.dx > 0 && Math.abs(gestureState.dy) < 50;
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped right enough, navigate back
        if (gestureState.dx > 100) {
          router.replace("/(auth)/sign-in");
        }
      },
    })
  ).current;

  // Track keyboard and screen dimensions
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.tsx:82',message:'Setting up keyboard listeners',data:{platform:Platform.OS,screenHeight},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.tsx:88',message:'Keyboard shown',data:{keyboardHeight:e.endCoordinates.height,screenHeight:e.endCoordinates.screenY},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.tsx:99',message:'Keyboard hidden',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        setKeyboardHeight(0);
      }
    );

    const dimensionsSubscription = Dimensions.addEventListener("change", ({ window }) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.tsx:105',message:'Screen dimensions changed',data:{height:window.height,width:window.width},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setScreenHeight(window.height);
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
      dimensionsSubscription?.remove();
    };
  }, []);

  // Scroll to bottom when component mounts to show welcome message
  useEffect(() => {
    // Use multiple timeouts to ensure FlatList is ready
    const timeout1 = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
    
    const timeout2 = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 500);
    
    const timeout3 = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 1000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, []);

  // Dummy itineraries
  const mockItineraries = {
    present: [
      {
        id: "1",
        destination: "Tokyo",
        dates: "Feb 5-8, 2026",
        hotel: "Park Hyatt Tokyo",
        flight: "NH 203 — SFO to NRT",
        status: "In Progress",
      },
    ] as Itinerary[],
    future: [
      {
        id: "2",
        destination: "San Francisco",
        dates: "Mar 15-20, 2026",
        hotel: "Fairmont SF",
        flight: "UA 512 — NRT to SFO",
        status: "Confirmed",
      },
      {
        id: "3",
        destination: "London",
        dates: "Apr 2-6, 2026",
        hotel: "The Savoy",
        flight: "BA 286 — SFO to LHR",
        status: "Pending",
      },
    ] as Itinerary[],
  };


  const toggleItineraries = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.tsx:154',message:'toggleItineraries called',data:{currentShowItineraries:showItineraries,currentHeight:itineraryHeight._value},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const newValue = !showItineraries;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.tsx:158',message:'State update prepared',data:{newValue,toValue:newValue?1:0},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Update state first, then animate
    setShowItineraries(newValue);
    const toValue = newValue ? 1 : 0;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.tsx:165',message:'Animation starting',data:{toValue,currentHeight:itineraryHeight._value},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Start animation immediately
    Animated.parallel([
      Animated.timing(itineraryHeight, {
        toValue,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(itineraryScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(itineraryScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.tsx:189',message:'Animation completed',data:{finalHeight:itineraryHeight._value,showItineraries:newValue},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    });
  };

  const handleSend = async (text: string) => {
    // #region agent log
    const msgId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.tsx:192',message:'handleSend called',data:{text,msgId,currentMessagesCount:messages.length},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const userMsg: Message = {
      id: msgId,
      role: "user",
      content: text,
    };
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.tsx:199',message:'Adding user message',data:{msgId,content:text,prevCount:messages.length},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    setMessages((prev) => {
      const newMessages = [...prev, userMsg];
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.tsx:202',message:'User message added to state',data:{newCount:newMessages.length,lastMsgId:newMessages[newMessages.length-1].id,allIds:newMessages.map(m=>m.id)},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return newMessages;
    });
    setSending(true);

    // Scroll to bottom after user message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Use mock responses for now (API connection not available)
    // Simulate a small delay for more natural feel
    setTimeout(() => {
      const mock = mockReply(userMsg.content);
      const assistantMsgId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: mock.reply,
        toolTrace: mock.tool_trace,
      };
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.tsx:213',message:'Adding assistant message',data:{assistantMsgId,userMsgId:userMsg.id,content:mock.reply.substring(0,50)},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setMessages((prev) => {
        const newMessages = [...prev, assistantMsg];
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.tsx:218',message:'Assistant message added to state',data:{newCount:newMessages.length,lastMsgId:newMessages[newMessages.length-1].id,allIds:newMessages.map(m=>m.id)},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return newMessages;
      });
      setSending(false);
      
      // Scroll to bottom after assistant message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 500);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: PARCHMENT }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      {...panResponder.panHandlers}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: Platform.OS === "ios" ? 60 : 40,
          paddingHorizontal: 24,
          paddingBottom: 24,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(17, 46, 147, 0.1)",
          backgroundColor: PARCHMENT,
        }}
      >
        {/* Top row: Winston branding and Profile button */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          {/* Winston Logo/Brand */}
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
                shadowColor: BLUE_ACCENT,
                shadowOffset: { width: 2, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 0,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  color: BLUE_ACCENT,
                  fontWeight: "400",
                  fontFamily: "System",
                }}
              >
                U
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Itinerary Button */}
        <Animated.View style={{ transform: [{ scale: itineraryScale }] }}>
          <TouchableOpacity
            onPress={toggleItineraries}
            activeOpacity={0.8}
            style={{
              width: "100%",
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: "rgba(17, 46, 147, 0.15)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              shadowColor: BLUE_ACCENT,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: showItineraries ? 0.08 : 0.06,
              shadowRadius: 3,
              elevation: showItineraries ? 2 : 1,
            }}
          >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(17, 46, 147, 0.05)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 14, color: BLUE_ACCENT, fontWeight: "600" }}>CAL</Text>
            </View>
            <Text
              style={{
                fontSize: 15,
                color: TEXT_DARK,
                fontWeight: "400",
                fontFamily: "System",
              }}
            >
              Itinerary
            </Text>
          </View>
        </TouchableOpacity>
        </Animated.View>

        {/* Itinerary Toggle */}
        <Animated.View
          style={{
            maxHeight: itineraryHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 60],
            }),
            overflow: "hidden",
            marginTop: showItineraries ? 12 : 0,
          }}
        >
          {showItineraries && (
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4 }}>
                <TouchableOpacity
                  onPress={() => setItineraryView("present")}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: itineraryView === "present" ? BLUE_ACCENT : "rgba(255, 255, 255, 0.3)",
                    borderWidth: 1,
                    borderColor: itineraryView === "present" ? BLUE_ACCENT : "rgba(107, 123, 158, 0.15)",
                    alignItems: "center",
                    shadowColor: itineraryView === "present" ? BLUE_ACCENT : "transparent",
                    shadowOffset: { width: 2, height: 3 },
                    shadowOpacity: itineraryView === "present" ? 0.15 : 0,
                    shadowRadius: 0,
                    elevation: itineraryView === "present" ? 2 : 0,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: itineraryView === "present" ? PARCHMENT : MUTED_BLUE,
                      fontWeight: "400",
                      fontFamily: "System",
                    }}
                  >
                    Present
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setItineraryView("future")}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: itineraryView === "future" ? BLUE_ACCENT : "rgba(255, 255, 255, 0.3)",
                    borderWidth: 1,
                    borderColor: itineraryView === "future" ? BLUE_ACCENT : "rgba(107, 123, 158, 0.15)",
                    alignItems: "center",
                    shadowColor: itineraryView === "future" ? BLUE_ACCENT : "transparent",
                    shadowOffset: { width: 2, height: 3 },
                    shadowOpacity: itineraryView === "future" ? 0.15 : 0,
                    shadowRadius: 0,
                    elevation: itineraryView === "future" ? 2 : 0,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: itineraryView === "future" ? PARCHMENT : MUTED_BLUE,
                      fontWeight: "400",
                      fontFamily: "System",
                    }}
                  >
                    Future
                  </Text>
                </TouchableOpacity>
              </View>
          )}
        </Animated.View>

        {/* Itinerary List */}
        {showItineraries && (
          <View style={{ marginTop: 12, paddingHorizontal: 4 }}>
              {mockItineraries[itineraryView].map((itinerary) => (
              <View
                key={itinerary.id}
                style={{
                  marginBottom: 8,
                  padding: 14,
                  backgroundColor: "rgba(173, 180, 200, 0.15)",
                  borderWidth: 1.5,
                  borderColor: "rgba(13, 43, 69, 0.2)",
                  borderRadius: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: "rgba(17, 46, 147, 0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: BLUE_ACCENT, fontWeight: "600" }}>FL</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: INK_DARK,
                        marginBottom: 4,
                      }}
                    >
                      {itinerary.flight}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: "rgba(13, 43, 69, 0.2)",
                      backgroundColor: "rgba(13, 43, 69, 0.05)",
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: INK_LIGHT,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                      }}
                    >
                      {itinerary.status}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: "rgba(17, 46, 147, 0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: BLUE_ACCENT, fontWeight: "600" }}>LO</Text>
                  </View>
                  <View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: INK_DARK,
                        fontFamily: "Georgia",
                        marginBottom: 2,
                      }}
                    >
                      {itinerary.destination}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "400",
                        color: INK_LIGHT,
                      }}
                    >
                      {itinerary.dates}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: "rgba(17, 46, 147, 0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: BLUE_ACCENT, fontWeight: "600" }}>HT</Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "400",
                      color: INK_LIGHT,
                    }}
                  >
                    {itinerary.hotel}
                  </Text>
                </View>
              </View>
              ))}
          </View>
        )}
      </View>

      {/* Chat Messages */}
      {messages.length > 0 && (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32 }}
          contentContainerStyle={{ 
            paddingBottom: Platform.OS === "ios" ? Math.max(100, keyboardHeight + 20) : 100, 
            flexGrow: 1,
          }}
          onContentSizeChange={() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 50);
          }}
          onLayout={() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 50);
          }}
          renderItem={({ item, index }) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.tsx:680',message:'Rendering message item',data:{index,msgId:item.id,role:item.role,contentLength:item.content.length},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            return (
              <View style={{ marginBottom: 24 }}>
                <MessageBubble message={item} />
                {item.toolTrace?.map((t: ToolTrace, i: number) => (
                  <ToolStatusBubble key={i} trace={t} />
                ))}
              </View>
            );
          }}
          removeClippedSubviews={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />
      )}
      <Composer onSend={handleSend} disabled={sending} />
    </KeyboardAvoidingView>
  );
}

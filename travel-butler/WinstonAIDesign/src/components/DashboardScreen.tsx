import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { InkDecorations } from './InkDecorations';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Hand-drawn SVG stamp icons in indigo ink style
function PlaneStamp({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="ink-stamp">
      <path
        d="M3 12L6 10.5L10 13L17 7L21 5L18 11L14 14L16.5 18L15 21L11 14.5L7 16L5 13.5L3 12Z"
        stroke="#0D2B45"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(13,43,69,0.08)"
      />
    </svg>
  );
}

function BedStamp({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="ink-stamp">
      <path
        d="M3 18V14C3 13 3.5 12 5 12H19C20.5 12 21 13 21 14V18"
        stroke="#0D2B45"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M3 12V8M7 12V9C7 8.5 7.3 8 8 8H11C11.7 8 12 8.5 12 9V12"
        stroke="#0D2B45"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line x1="3" y1="18" x2="3" y2="20" stroke="#0D2B45" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="21" y1="18" x2="21" y2="20" stroke="#0D2B45" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MapPinStamp({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="ink-stamp">
      <path
        d="M12 2C8.5 2 6 4.5 6 7.5C6 12 12 22 12 22C12 22 18 12 18 7.5C18 4.5 15.5 2 12 2Z"
        stroke="#0D2B45"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="rgba(13,43,69,0.06)"
      />
      <circle cx="12" cy="7.5" r="2" stroke="#0D2B45" strokeWidth="1.5" />
    </svg>
  );
}

export function DashboardScreen() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'present' | 'future' | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Good evening. I\'m Winston, your travel assistant. How may I help you plan your next journey?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputValue('');

    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Very good. I shall look into the finest options for your itinerary straightaway.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const mockItineraries = {
    present: [
      {
        id: '1',
        destination: 'Tokyo',
        dates: 'Feb 5-8, 2026',
        hotel: 'Park Hyatt Tokyo',
        flight: 'NH 203 — SFO to NRT',
        status: 'In Progress',
      },
    ],
    future: [
      {
        id: '2',
        destination: 'San Francisco',
        dates: 'Mar 15-20, 2026',
        hotel: 'Fairmont SF',
        flight: 'UA 512 — NRT to SFO',
        status: 'Confirmed',
      },
      {
        id: '3',
        destination: 'London',
        dates: 'Apr 2-6, 2026',
        hotel: 'The Savoy',
        flight: 'BA 286 — SFO to LHR',
        status: 'Pending',
      },
    ],
  };

  return (
    <div
      className="washi-texture min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: '#F9F5E3' }}
    >
      {/* SVG filter for ink bleed */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="inkBleedFilter" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Decorative ink elements */}
      <InkDecorations variant="dashboard" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="px-6 pt-8 pb-3 relative z-10"
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="p-2 transition-colors"
            style={{ color: '#0D2B45' }}
          >
            <ArrowLeft size={22} strokeWidth={1.5} />
          </button>
          <h1
            className="ink-header"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              fontSize: '1.5rem',
              letterSpacing: '-0.01em',
              color: '#0D2B45',
            }}
          >
            Winston AI
          </h1>
          <div style={{ width: '38px' }} />
        </div>
      </motion.div>

      {/* Segmented Toggle - centered, sketched style */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="px-6 pb-3 relative z-10"
      >
        <div
          className="flex items-center justify-center"
          style={{ gap: '0' }}
        >
          <button
            onClick={() => setActiveView(activeView === 'present' ? null : 'present')}
            style={{
              fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif",
              fontSize: '0.8rem',
              fontWeight: activeView === 'present' ? 600 : 400,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#0D2B45',
              padding: '0.5rem 1rem',
              background: activeView === 'present' ? 'rgba(13, 43, 69, 0.1)' : 'transparent',
              border: '1.5px solid rgba(13, 43, 69, 0.25)',
              borderRight: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Present Itineraries
          </button>
          <button
            onClick={() => setActiveView(activeView === 'future' ? null : 'future')}
            style={{
              fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif",
              fontSize: '0.8rem',
              fontWeight: activeView === 'future' ? 600 : 400,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#0D2B45',
              padding: '0.5rem 1rem',
              background: activeView === 'future' ? 'rgba(13, 43, 69, 0.1)' : 'transparent',
              border: '1.5px solid rgba(13, 43, 69, 0.25)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Future Itineraries
          </button>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col px-6 pb-4 relative z-10 overflow-hidden">
        {/* Itinerary List - travel log style */}
        <AnimatePresence mode="wait">
          {activeView && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
              style={{ marginBottom: '0.75rem' }}
            >
              {/* Thin section divider */}
              <div
                style={{
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(13,43,69,0.15) 20%, rgba(13,43,69,0.15) 80%, transparent)',
                  marginBottom: '0.75rem',
                }}
              />

              {mockItineraries[activeView].map((itinerary, index) => (
                <motion.div
                  key={itinerary.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  style={{ marginBottom: index < mockItineraries[activeView].length - 1 ? '0.5rem' : '0' }}
                >
                  {/* Itinerary entry - handwritten travel log style */}
                  <div
                    className="ink-box"
                    style={{
                      padding: '0.875rem 1rem',
                      background: 'rgba(249, 245, 227, 0.6)',
                      position: 'relative',
                    }}
                  >
                    {/* Flight entry */}
                    <div className="flex items-start" style={{ gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div style={{ paddingTop: '2px', flexShrink: 0 }}>
                        <PlaneStamp size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p className="ink-text" style={{
                          fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif",
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          color: '#0D2B45',
                        }}>
                          {itinerary.flight}
                        </p>
                      </div>
                      <span className="ink-text" style={{
                        fontFamily: "'Source Sans 3', sans-serif",
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#1A3D5C',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        padding: '0.15rem 0.5rem',
                        border: '1px solid rgba(13,43,69,0.2)',
                        whiteSpace: 'nowrap',
                      }}>
                        {itinerary.status}
                      </span>
                    </div>

                    {/* Hand-drawn dashed connector */}
                    <div style={{
                      marginLeft: '8px',
                      height: '12px',
                      width: '1.5px',
                      backgroundImage: 'repeating-linear-gradient(to bottom, rgba(13,43,69,0.25) 0px, rgba(13,43,69,0.25) 3px, transparent 3px, transparent 6px)',
                    }} />

                    {/* Destination + Hotel entry */}
                    <div className="flex items-start" style={{ gap: '0.75rem', marginBottom: '0.35rem' }}>
                      <div style={{ paddingTop: '2px', flexShrink: 0 }}>
                        <MapPinStamp size={18} />
                      </div>
                      <div>
                        <p className="ink-text" style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: '#0D2B45',
                          marginBottom: '0.1rem',
                        }}>
                          {itinerary.destination}
                        </p>
                        <p className="ink-text" style={{
                          fontFamily: "'Source Sans 3', sans-serif",
                          fontSize: '0.78rem',
                          fontWeight: 400,
                          color: '#1A3D5C',
                        }}>
                          {itinerary.dates}
                        </p>
                      </div>
                    </div>

                    {/* Dashed connector */}
                    <div style={{
                      marginLeft: '8px',
                      height: '12px',
                      width: '1.5px',
                      backgroundImage: 'repeating-linear-gradient(to bottom, rgba(13,43,69,0.25) 0px, rgba(13,43,69,0.25) 3px, transparent 3px, transparent 6px)',
                    }} />

                    {/* Hotel entry */}
                    <div className="flex items-start" style={{ gap: '0.75rem' }}>
                      <div style={{ paddingTop: '2px', flexShrink: 0 }}>
                        <BedStamp size={18} />
                      </div>
                      <p className="ink-text" style={{
                        fontFamily: "'Source Sans 3', sans-serif",
                        fontSize: '0.82rem',
                        fontWeight: 400,
                        color: '#1A3D5C',
                      }}>
                        {itinerary.hotel}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Bottom section divider */}
              <div
                style={{
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(13,43,69,0.15) 20%, rgba(13,43,69,0.15) 80%, transparent)',
                  marginTop: '0.75rem',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Messages - dominates the space */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex-1 overflow-y-auto pr-1"
          style={{
            minHeight: '200px',
            paddingBottom: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="ink-text"
                  style={{
                    maxWidth: '80%',
                    padding: '0.7rem 0.9rem',
                    background: message.isUser
                      ? 'rgba(13, 43, 69, 0.08)'
                      : 'transparent',
                    border: message.isUser
                      ? '1px solid rgba(13, 43, 69, 0.15)'
                      : '1px solid rgba(13, 43, 69, 0.1)',
                    borderLeft: message.isUser
                      ? '1px solid rgba(13, 43, 69, 0.15)'
                      : '2px solid rgba(13, 43, 69, 0.25)',
                  }}
                >
                  {!message.isUser && (
                    <p style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      fontStyle: 'italic',
                      color: '#1A3D5C',
                      marginBottom: '0.25rem',
                      letterSpacing: '0.03em',
                    }}>
                      Winston
                    </p>
                  )}
                  <p
                    style={{
                      fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif",
                      color: '#0D2B45',
                      fontWeight: 400,
                      fontSize: '0.88rem',
                      lineHeight: 1.55,
                    }}
                  >
                    {message.text}
                  </p>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </motion.div>

        {/* Chat Input - sketched section at the bottom */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            borderTop: '1.5px solid rgba(13, 43, 69, 0.15)',
            paddingTop: '0.75rem',
            marginTop: '0.5rem',
          }}
        >
          {/* Thin decorative line above input */}
          <div style={{
            width: '40px',
            height: '1px',
            background: 'rgba(13, 43, 69, 0.2)',
            marginBottom: '0.5rem',
          }} />

          <div className="flex items-center" style={{ gap: '0.75rem' }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask Winston..."
              className="ink-underline ink-text"
              style={{
                flex: 1,
                fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif",
                color: '#0D2B45',
                fontWeight: 400,
                fontSize: '0.9rem',
                padding: '0.5rem 0',
                background: 'transparent',
                outline: 'none',
                borderBottom: '1.5px solid rgba(13, 43, 69, 0.2)',
              }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSendMessage}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: 'transparent',
                border: '1.5px solid rgba(13, 43, 69, 0.3)',
                cursor: 'pointer',
                color: '#0D2B45',
              }}
            >
              <Send size={16} strokeWidth={1.5} />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

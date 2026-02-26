import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { FaSearch, FaUser, FaCog, FaHome, FaEnvelope, FaPaperPlane, FaArrowLeft, FaCircle, FaImage } from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import { glassToast } from "../components/GlassToast";

export default function Messages() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Authenticate & Fetch User's Chats
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        navigate("/");
      } else {
        setUser(currentUser);
        const q = query(collection(db, "chats"), where("participants", "array-contains", currentUser.uid));
        
        const unsubChats = onSnapshot(q, (snapshot) => {
          const fetchedChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          fetchedChats.sort((a: any, b: any) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
          setChats(fetchedChats);
        });

        return () => unsubChats();
      }
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  // 2. Listen to Active Chat Messages
  useEffect(() => {
    if (!activeChat) return;

    const q = query(collection(db, `chats/${activeChat.id}/messages`), orderBy("createdAt", "asc"));
    const unsubMessages = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsubMessages();
  }, [activeChat]);

  // --- NEW: AUTO-MARK AS READ WHEN CHAT IS OPEN ---
  useEffect(() => {
    if (!activeChat || !user) return;
    const currentChat = chats.find(c => c.id === activeChat.id);
    if (currentChat?.hasUnread?.[user.uid]) {
      updateDoc(doc(db, "chats", activeChat.id), {
        [`hasUnread.${user.uid}`]: false
      });
    }
  }, [chats, activeChat, user]);

  // --- ONLINE PRESENCE: Update user's online status ---
  useEffect(() => {
    if (!user) return;
    const presenceRef = doc(db, "presence", user.uid);
    
    const setOnline = () => setDoc(presenceRef, { online: true, lastSeen: serverTimestamp() }, { merge: true });
    const setOffline = () => setDoc(presenceRef, { online: false, lastSeen: serverTimestamp() }, { merge: true });
    
    setOnline();
    window.addEventListener("beforeunload", setOffline);
    document.addEventListener("visibilitychange", () => {
      document.visibilityState === "visible" ? setOnline() : setOffline();
    });
    
    return () => {
      setOffline();
      window.removeEventListener("beforeunload", setOffline);
    };
  }, [user]);

  // --- LISTEN TO ONLINE STATUS of chat participants ---
  useEffect(() => {
    if (!user || chats.length === 0) return;
    const otherUids = [...new Set(chats.map(c => c.participants?.find((uid: string) => uid !== user.uid)).filter(Boolean))];
    if (otherUids.length === 0) return;

    const unsubs = otherUids.map(uid => 
      onSnapshot(doc(db, "presence", uid!), (snap) => {
        if (snap.exists()) {
          setOnlineUsers(prev => ({ ...prev, [uid!]: snap.data().online === true }));
        }
      })
    );
    return () => unsubs.forEach(u => u());
  }, [user, chats]);

  // --- LISTEN TO TYPING STATUS on active chat ---
  useEffect(() => {
    if (!activeChat) return;
    const unsub = onSnapshot(doc(db, "chats", activeChat.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTypingUsers(data.typing || {});
      }
    });
    return () => unsub();
  }, [activeChat]);

  // --- HANDLE TYPING: set typing flag, clear after 2s ---
  const handleTyping = useCallback(() => {
    if (!activeChat || !user) return;
    updateDoc(doc(db, "chats", activeChat.id), { [`typing.${user.uid}`]: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, "chats", activeChat.id), { [`typing.${user.uid}`]: false });
    }, 2000);
  }, [activeChat, user]);

  // --- Clear typing flag on unmount/chat switch ---
  useEffect(() => {
    return () => {
      if (activeChat && user) {
        updateDoc(doc(db, "chats", activeChat.id), { [`typing.${user.uid}`]: false }).catch(() => {});
      }
    };
  }, [activeChat, user]);

  // 3. Send a Message & Mark Unread for Receiver
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !user) return;

    const text = newMessage;
    setNewMessage(""); 

    // Clear typing indicator immediately on send
    if (activeChat && user) {
      updateDoc(doc(db, "chats", activeChat.id), { [`typing.${user.uid}`]: false }).catch(() => {});
    }

    try {
      await addDoc(collection(db, `chats/${activeChat.id}/messages`), {
        text: text,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });

      const otherUid = activeChat.participants.find((uid: string) => uid !== user.uid);
      await updateDoc(doc(db, "chats", activeChat.id), { 
        lastMessage: text, 
        updatedAt: serverTimestamp(),
        [`hasUnread.${otherUid}`]: true // Turns on the notification for the other person
      });
      
    } catch (error) {
      glassToast.error("Failed to send message");
    }
  };

  const getOtherUser = (chat: any) => {
    const otherUid = chat.participants.find((uid: string) => uid !== user?.uid);
    const userData = chat.users[otherUid] || { name: "Unknown User", avatar: "https://ui-avatars.com/api/?name=U" };
    return { ...userData, uid: otherUid };
  };

  // --- IMAGE UPLOAD HANDLER ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat || !user) return;
    if (!file.type.startsWith('image/')) { glassToast.error("Only images are allowed."); return; }
    if (file.size > 5 * 1024 * 1024) { glassToast.error("Image must be under 5MB."); return; }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'jdj7tsar');
      
      const res = await fetch('https://api.cloudinary.com/v1_1/dg6kzqq5n/image/upload', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.secure_url) {
        await addDoc(collection(db, `chats/${activeChat.id}/messages`), {
          text: '',
          imageUrl: data.secure_url,
          senderId: user.uid,
          createdAt: serverTimestamp()
        });
        
        const otherUid = activeChat.participants.find((uid: string) => uid !== user.uid);
        await updateDoc(doc(db, "chats", activeChat.id), { 
          lastMessage: '📷 Image', 
          updatedAt: serverTimestamp(),
          [`hasUnread.${otherUid}`]: true
        });
      }
    } catch (error) {
      glassToast.error("Failed to upload image.");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  return (
    <div className="dashboard-revamp" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* NAVBAR */}
      <nav className="dash-nav" style={{ flexShrink: 0, zIndex: 100 }}>
        <div className="dash-nav-left" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          
          {/* --- SMART BACK BUTTON --- */}
          <button 
            onClick={() => {
              if (activeChat) {
                setActiveChat(null); // Step 1: Go back to the list of messages
              } else {
                navigate('/dashboard'); // Step 2: Go back to the listings
              }
            }} 
            style={{ 
              background: '#f3f4f6', 
              border: 'none', 
              padding: '10px 15px', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '0.9rem', 
              fontWeight: '600', 
              color: '#374151',
              transition: '0.2s'
            }}
            className="msg-back-btn"
          >
            <FaArrowLeft /> {activeChat ? 'Back to Inbox' : 'Back to Listings'}
          </button>
          
          <img src={logo} alt="MBC Logo" className="dash-logo" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer", marginLeft: '10px' }} />
          <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'none' }} className="desktop-title msg-title">Messages</h2>
        </div>
        <div className="dash-nav-right">
          <div className="dash-user-trigger" onClick={() => navigate("/profile")}>
            <img src={user?.photoURL || "https://ui-avatars.com/api/?name=User"} alt="avatar" className="dash-avatar" />
          </div>
        </div>
      </nav>

      {/* MAIN CHAT LAYOUT */}
      {/* FIXED: Added paddingTop: '100px' to push the chat down below the floating navbar */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '100px 20px 20px 20px', gap: '20px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* LEFT SIDEBAR: CHAT LIST */}
        <div style={{ width: '350px', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', borderRadius: '20px', border: '1px solid #e5e7eb', display: activeChat ? 'none' : 'flex', flexDirection: 'column' }} className="chat-sidebar-mobile">
          
          <div className="msg-search-area" style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <div className="dash-search-wrapper" style={{ margin: 0 }}>
              <FaSearch className="dash-search-icon" />
              <input type="text" placeholder="Search conversations..." className="dash-search-input" />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {chats.map(chat => {
              const otherUser = getOtherUser(chat);
              const isActive = activeChat?.id === chat.id;
              const isUnread = chat.hasUnread?.[user?.uid]; 

              return (
                <div 
                  key={chat.id} 
                  onClick={() => setActiveChat(chat)}
                  className={`msg-chat-item ${isActive ? 'msg-chat-item-active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderRadius: '12px', cursor: 'pointer', marginBottom: '5px', background: isActive ? '#f3f4f6' : 'transparent' }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img src={otherUser.avatar} alt="avatar" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
                    {onlineUsers[otherUser.uid] && (
                      <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '12px', height: '12px', background: '#22c55e', borderRadius: '50%', border: '2px solid white' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 className="msg-chat-name" style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: isUnread ? '800' : '500' }}>{otherUser.name}</h4>
                      {isUnread && <div style={{ width: '10px', height: '10px', background: '#2563eb', borderRadius: '50%' }}></div>}
                    </div>
                    <p className="msg-chat-preview" style={{ margin: 0, fontSize: '0.85rem', fontWeight: isUnread ? '600' : 'normal', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {chat.lastMessage || "Started a conversation"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: ACTIVE CHAT */}
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', borderRadius: '20px', border: '1px solid #e5e7eb', display: !activeChat ? 'none' : 'flex', flexDirection: 'column' }} className="chat-window-mobile">
          {activeChat ? (
            <>
              {/* Header */}
              <div className="msg-chat-header" style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '15px', borderRadius: '20px 20px 0 0' }}>
                {/* Mobile back to inbox button */}
                <button className="chat-back-btn" onClick={() => setActiveChat(null)} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', display: 'none' }}><FaArrowLeft /></button>
                <div style={{ position: 'relative' }}>
                  <img src={getOtherUser(activeChat).avatar} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                  {onlineUsers[getOtherUser(activeChat).uid] && (
                    <div style={{ position: 'absolute', bottom: '0', right: '0', width: '11px', height: '11px', background: '#22c55e', borderRadius: '50%', border: '2px solid white' }} />
                  )}
                </div>
                <div>
                  <h3 className="msg-active-name" style={{ margin: 0 }}>{getOtherUser(activeChat).name}</h3>
                  <span style={{ fontSize: '0.75rem', color: onlineUsers[getOtherUser(activeChat).uid] ? '#22c55e' : '#9ca3af' }}>
                    {(() => {
                      const otherUid = getOtherUser(activeChat).uid;
                      if (typingUsers[otherUid]) return 'typing...';
                      return onlineUsers[otherUid] ? 'Online' : 'Offline';
                    })()}
                  </span>
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.map((msg, idx) => {
                  const isMe = msg.senderId === user?.uid;
                  const ts = msg.createdAt?.toDate ? msg.createdAt.toDate() : msg.createdAt ? new Date(msg.createdAt) : null;
                  const timeStr = ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  
                  // Show date separator if day changes between messages
                  const prevMsg = idx > 0 ? messages[idx - 1] : null;
                  const prevTs = prevMsg?.createdAt?.toDate ? prevMsg.createdAt.toDate() : prevMsg?.createdAt ? new Date(prevMsg.createdAt) : null;
                  const showDateSep = ts && (!prevTs || ts.toDateString() !== prevTs.toDateString());
                  
                  return (
                    <div key={msg.id}>
                      {showDateSep && (
                        <div style={{ textAlign: 'center', margin: '10px 0' }}>
                          <span className="msg-date-separator" style={{ fontSize: '0.75rem', color: '#9ca3af', background: 'rgba(243,244,246,0.8)', padding: '4px 14px', borderRadius: '12px' }}>
                            {ts!.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '70%' }}>
                          <div className={isMe ? 'msg-bubble-sent' : 'msg-bubble-received'} style={{ padding: '12px 16px', borderRadius: '16px', borderBottomRightRadius: isMe ? '4px' : '16px', borderBottomLeftRadius: isMe ? '16px' : '4px', fontSize: '0.95rem' }}>
                            {msg.imageUrl ? (
                              <img 
                                src={msg.imageUrl} 
                                alt="Shared image" 
                                style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '12px', cursor: 'pointer', display: 'block' }}
                                onClick={() => window.open(msg.imageUrl, '_blank')}
                              />
                            ) : msg.text}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '3px', textAlign: isMe ? 'right' : 'left', paddingInline: '4px' }}>
                            {timeStr}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing Indicator */}
              {(() => {
                const otherUid = getOtherUser(activeChat).uid;
                if (typingUsers[otherUid]) {
                  return (
                    <div style={{ padding: '4px 20px 8px', fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>
                      <span className="msg-typing-indicator">{getOtherUser(activeChat).name} is typing</span>
                      <span className="msg-typing-dots">
                        <span style={{ animationDelay: '0s' }}>.</span>
                        <span style={{ animationDelay: '0.2s' }}>.</span>
                        <span style={{ animationDelay: '0.4s' }}>.</span>
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Input Area */}
              <div className="msg-input-area" style={{ padding: '20px', borderTop: '1px solid #e5e7eb', borderRadius: '0 0 20px 20px' }}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
                  <button 
                    type="button" 
                    onClick={() => imageInputRef.current?.click()} 
                    disabled={uploadingImage}
                    className="msg-image-btn"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', color: '#6b7280', fontSize: '1.2rem', flexShrink: 0, transition: '0.2s', opacity: uploadingImage ? 0.5 : 1 }}
                  >
                    {uploadingImage ? <FaImage className="msg-uploading-spin" /> : <FaImage />}
                  </button>
                  <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }} className="msg-input-field" style={{ flex: 1, padding: '15px', borderRadius: '50px', outline: 'none' }} />
                  <button type="submit" disabled={!newMessage.trim()} className="msg-send-btn" style={{ border: 'none', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FaPaperPlane /></button>
                </form>
              </div>
            </>
          ) : (
            <div className="msg-empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}><FaEnvelope size={48} style={{ marginBottom: '15px', opacity: 0.5 }} /><p>Select a conversation</p></div>
          )}
        </div>
      </div>

      <style>{`
        .msg-typing-dots span {
          animation: typingBounce 1.4s infinite;
          display: inline-block;
          font-weight: bold;
        }
        @keyframes typingBounce {
          0%, 60%, 100% { opacity: 0.2; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
        .msg-uploading-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .msg-image-btn:hover { color: #2563eb !important; }
        @media (max-width: 768px) {
          .chat-sidebar-mobile { width: 100% !important; display: ${activeChat ? 'none' : 'flex'} !important; border-radius: 0 !important; }
          .chat-window-mobile { display: ${activeChat ? 'flex' : 'none'} !important; border-radius: 0 !important; }
          .chat-back-btn { display: block !important; }
          .desktop-title { display: none !important; }
        }
        @media (min-width: 769px) {
          .desktop-title { display: block !important; }
        }
      `}</style>
    </div>
  );
}
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { FaSearch, FaEnvelope, FaPaperPlane, FaArrowLeft, FaImage, FaSpinner } from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import { glassToast } from "../components/GlassToast";

export default function Messages() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  
  // Image Upload State
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Time formatters
  const formatTime = (date: any) => {
    if (!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateSeparator = (date: any) => {
    if (!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // 1. Auth & Fetch Chats
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

  // 2. Fetch Active Chat Messages
  useEffect(() => {
    if (!activeChat) return;
    const q = query(collection(db, `chats/${activeChat.id}/messages`), orderBy("createdAt", "asc"));
    const unsubMessages = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubMessages();
  }, [activeChat]);

  // 3. Mark as read
  useEffect(() => {
    if (!activeChat || !user) return;
    const currentChat = chats.find(c => c.id === activeChat.id);
    if (currentChat?.hasUnread?.[user.uid]) {
      updateDoc(doc(db, "chats", activeChat.id), {
        [`hasUnread.${user.uid}`]: false
      });
    }
  }, [chats, activeChat, user]);

  // 4. Handle Image Upload
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat || !user) return;

    setIsUploading(true);
    try {
      const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dg6kzqq5n";
      const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "jdj7tsar";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
      });
      const data = await response.json();

      if (data.secure_url) {
        await addDoc(collection(db, `chats/${activeChat.id}/messages`), {
          imageUrl: data.secure_url,
          senderId: user.uid,
          createdAt: serverTimestamp()
        });

        const otherUid = activeChat.participants.find((uid: string) => uid !== user.uid);
        await updateDoc(doc(db, "chats", activeChat.id), { 
          lastMessage: "📷 Sent an image", 
          updatedAt: serverTimestamp(),
          [`hasUnread.${otherUid}`]: true 
        });
      }
    } catch (error) {
      glassToast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = ""; // Reset input
    }
  };

  // 5. Handle Text Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !user) return;
    
    const text = newMessage;
    setNewMessage(""); 
    
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
        [`hasUnread.${otherUid}`]: true 
      });
    } catch (error) {
      glassToast.error("Failed to send message");
    }
  };

  const getOtherUser = (chat: any) => {
    const otherUid = chat.participants.find((uid: string) => uid !== user?.uid);
    return chat.users[otherUid] || { name: "Unknown User", avatar: "https://ui-avatars.com/api/?name=U" };
  };

  // --- Search Logic ---
  const filteredChats = chats.filter(chat => {
    if (!searchQuery.trim()) return true;
    const otherUser = getOtherUser(chat);
    return otherUser.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="dashboard-revamp" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* NAVBAR */}
      <nav className="dash-nav" style={{ flexShrink: 0, zIndex: 100 }}>
        <div className="dash-nav-left" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={() => activeChat ? setActiveChat(null) : navigate('/dashboard')} 
            className="msg-back-btn"
            style={{ background: '#f3f4f6', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}
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

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '100px 20px 20px 20px', gap: '20px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* LEFT SIDEBAR */}
        <div style={{ width: '350px', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', borderRadius: '20px', border: '1px solid #e5e7eb', display: activeChat ? 'none' : 'flex', flexDirection: 'column' }} className="chat-sidebar-mobile">
          <div className="msg-search-area" style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <div className="dash-search-wrapper" style={{ margin: 0 }}>
              <FaSearch className="dash-search-icon" />
              <input 
                type="text" 
                placeholder="Search conversations..." 
                className="dash-search-input" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {/* --- FIX: Rendering filteredChats instead of chats --- */}
            {filteredChats.length === 0 ? (
               <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>No conversations found.</div>
            ) : (
              filteredChats.map(chat => {
                const otherUser = getOtherUser(chat);
                const isActive = activeChat?.id === chat.id;
                const isUnread = chat.hasUnread?.[user?.uid]; 
                return (
                  <div key={chat.id} onClick={() => setActiveChat(chat)} className={`msg-chat-item ${isActive ? 'msg-chat-item-active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderRadius: '12px', cursor: 'pointer', marginBottom: '5px', background: isActive ? '#f3f4f6' : 'transparent' }}>
                    <img src={otherUser.avatar} alt="avatar" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: isUnread ? '800' : '500' }}>{otherUser.name}</h4>
                        {isUnread && <div style={{ width: '10px', height: '10px', background: '#2563eb', borderRadius: '50%' }}></div>}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: isUnread ? '600' : 'normal', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {chat.lastMessage || "Started a conversation"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', borderRadius: '20px', border: '1px solid #e5e7eb', display: !activeChat ? 'none' : 'flex', flexDirection: 'column' }} className="chat-window-mobile">
          {activeChat ? (
            <>
              <div className="msg-chat-header" style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '15px', borderRadius: '20px 20px 0 0' }}>
                <button className="chat-back-btn" onClick={() => setActiveChat(null)} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', display: 'none' }}><FaArrowLeft /></button>
                <img src={getOtherUser(activeChat).avatar} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{getOtherUser(activeChat).name}</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Offline</span>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {messages.map((msg, index) => {
                  const isMe = msg.senderId === user?.uid;
                  const showDate = index === 0 || formatDateSeparator(messages[index-1].createdAt) !== formatDateSeparator(msg.createdAt);
                  
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div style={{ textAlign: 'center', margin: '20px 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                            {formatDateSeparator(msg.createdAt)}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <div className={isMe ? 'msg-bubble-sent' : 'msg-bubble-received'} style={{ maxWidth: '70%', padding: msg.imageUrl ? '8px' : '12px 16px', borderRadius: '16px', borderBottomRightRadius: isMe ? '4px' : '16px', borderBottomLeftRadius: isMe ? '16px' : '4px' }}>
                          {msg.imageUrl ? (
                            <img src={msg.imageUrl} alt="Sent" style={{ width: '100%', borderRadius: '12px', display: 'block', cursor: 'pointer' }} onClick={() => window.open(msg.imageUrl, '_blank')} />
                          ) : (
                            <span style={{ fontSize: '0.95rem' }}>{msg.text}</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '5px', padding: '0 5px' }}>
                            {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="msg-input-area" style={{ padding: '20px', borderTop: '1px solid #e5e7eb', borderRadius: '0 0 20px 20px' }}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  
                  {/* Image Upload Button */}
                  <input type="file" ref={imageInputRef} hidden accept="image/*" onChange={handleImageSelect} />
                  <button type="button" onClick={() => imageInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                    {isUploading ? <FaSpinner className="spin" size={22} /> : <FaImage size={22} />}
                  </button>
                  
                  <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="msg-input-field" style={{ flex: 1, padding: '15px', borderRadius: '50px', outline: 'none' }} />
                  <button type="submit" disabled={!newMessage.trim() && !isUploading} className="msg-send-btn" style={{ border: 'none', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FaPaperPlane /></button>
                </form>
              </div>
            </>
          ) : (
            <div className="msg-empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}><FaEnvelope size={48} style={{ marginBottom: '15px', opacity: 0.5 }} /><p>Select a conversation</p></div>
          )}
        </div>
      </div>

      <style>{`
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
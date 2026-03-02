import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, setDoc, getDocs } from "firebase/firestore";
import { FaSearch, FaEnvelope, FaPaperPlane, FaArrowLeft, FaImage, FaSpinner, FaTrash, FaStar, FaCheck, FaCheckDouble } from "react-icons/fa";
import { SkeletonList } from "../components/SkeletonLoader";
import logo from "../assets/MBC Logo.png";
import { glassToast } from "../components/GlassToast";
import Swal from "sweetalert2";
import DOMPurify from "dompurify";

export default function Messages() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  
  // Image Upload State
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Online presence state
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<Date | null>(null);
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, Date>>({});

  // Typing indicator state
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read receipt state (lastRead timestamp per user from active chat)
  const [otherLastRead, setOtherLastRead] = useState<any>(null);

  const isUserOnline = (lastSeen: Date | null) => {
    if (!lastSeen) return false;
    return (Date.now() - lastSeen.getTime()) < 5 * 60 * 1000; // 5 minutes
  };

  const formatLastSeen = (lastSeen: Date | null) => {
    if (!lastSeen) return "Offline";
    if (isUserOnline(lastSeen)) return "Online";
    const diff = Date.now() - lastSeen.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Last seen ${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Last seen ${hours}h ago`;
    return `Last seen ${lastSeen.toLocaleDateString()}`;
  };

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
          setIsLoadingChats(false);
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

  // 2b. Update own lastSeen periodically
  useEffect(() => {
    if (!user) return;
    const updateLastSeen = () => {
      updateDoc(doc(db, "users", user.uid), { lastSeen: serverTimestamp() }).catch(() => {});
    };
    updateLastSeen();
    const interval = setInterval(updateLastSeen, 2 * 60 * 1000); // every 2 minutes
    return () => clearInterval(interval);
  }, [user]);

  // 2b2. Fetch all chat participants' online status
  useEffect(() => {
    if (!user || chats.length === 0) return;
    const fetchStatuses = async () => {
      const statuses: Record<string, Date> = {};
      const otherUids = [...new Set(chats.map(c => c.participants.find((uid: string) => uid !== user.uid)).filter(Boolean))];
      await Promise.all(otherUids.map(async (uid: string) => {
        try {
          const snap = await getDoc(doc(db, "users", uid));
          const data = snap.data();
          if (data?.lastSeen) {
            statuses[uid] = data.lastSeen.toDate ? data.lastSeen.toDate() : new Date(data.lastSeen);
          }
        } catch { /* ignore */ }
      }));
      setOnlineStatuses(statuses);
    };
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 60 * 1000); // every minute
    return () => clearInterval(interval);
  }, [user, chats]);

  // 2c. Fetch other user's lastSeen when activeChat changes
  useEffect(() => {
    if (!activeChat || !user) { setOtherUserLastSeen(null); return; }
    const otherUid = activeChat.participants.find((uid: string) => uid !== user.uid);
    if (!otherUid) return;

    // Poll the other user's lastSeen every 30 seconds
    const fetchLastSeen = async () => {
      try {
        const snap = await getDoc(doc(db, "users", otherUid));
        const data = snap.data();
        if (data?.lastSeen) {
          const d = data.lastSeen.toDate ? data.lastSeen.toDate() : new Date(data.lastSeen);
          setOtherUserLastSeen(d);
        }
      } catch { /* ignore */ }
    };
    fetchLastSeen();
    const interval = setInterval(fetchLastSeen, 30 * 1000);
    return () => clearInterval(interval);
  }, [activeChat, user]);

  // 3. Mark as read + update lastRead
  useEffect(() => {
    if (!activeChat || !user) return;
    const currentChat = chats.find(c => c.id === activeChat.id);
    if (currentChat?.hasUnread?.[user.uid]) {
      updateDoc(doc(db, "chats", activeChat.id), {
        [`hasUnread.${user.uid}`]: false,
        [`lastRead.${user.uid}`]: serverTimestamp(),
      });
    }
  }, [chats, activeChat, user]);

  // 3b. Listen for typing & lastRead from active chat doc (real-time)
  useEffect(() => {
    if (!activeChat || !user) {
      setIsOtherTyping(false);
      setOtherLastRead(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "chats", activeChat.id), (snap) => {
      const data = snap.data();
      if (!data) return;
      const otherUid = data.participants?.find((uid: string) => uid !== user.uid);
      if (!otherUid) return;

      // Typing indicator — check if other user's typing timestamp is recent (< 5 seconds)
      const typingTs = data.typing?.[otherUid];
      if (typingTs) {
        const ts = typingTs.toDate ? typingTs.toDate() : new Date(typingTs);
        setIsOtherTyping(Date.now() - ts.getTime() < 5000);
      } else {
        setIsOtherTyping(false);
      }

      // Read receipt — other user's lastRead timestamp
      const lr = data.lastRead?.[otherUid];
      setOtherLastRead(lr || null);
    });
    return () => unsub();
  }, [activeChat, user]);

  // 3c. Handle typing status updates (debounced)
  const handleTyping = () => {
    if (!activeChat || !user) return;
    // Update typing status in Firestore
    updateDoc(doc(db, "chats", activeChat.id), {
      [`typing.${user.uid}`]: serverTimestamp(),
    }).catch(() => {});

    // Clear previous timeout and set new one to stop typing after 3 seconds
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (!activeChat || !user) return;
      updateDoc(doc(db, "chats", activeChat.id), {
        [`typing.${user.uid}`]: null,
      }).catch(() => {});
    }, 3000);
  };

  // 4. Handle Image Upload
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat || !user) return;

    setIsUploading(true);
    try {
      const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error("Missing Cloudinary configuration in .env");
      }

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
    
    // Clear typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateDoc(doc(db, "chats", activeChat.id), {
      [`typing.${user.uid}`]: null,
    }).catch(() => {});
    
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

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeChat) return;
    try {
      await deleteDoc(doc(db, `chats/${activeChat.id}/messages`, messageId));
      glassToast.success("Message deleted");
    } catch {
      glassToast.error("Failed to delete message");
    }
  };

  const getOtherUser = (chat: any) => {
    const otherUid = chat.participants.find((uid: string) => uid !== user?.uid);
    return chat.users[otherUid] || { name: "Unknown User", avatar: "https://ui-avatars.com/api/?name=U" };
  };

  // --- Rate Agent ---
  const RATING_CATEGORIES = ['Responsiveness', 'Negotiation Skills', 'Market Knowledge', 'Professionalism', 'Process Guidance', 'Closing Support'];

  const handleRateAgent = async () => {
    if (!activeChat || !user) return;
    const otherUid = activeChat.participants.find((uid: string) => uid !== user.uid);
    if (!otherUid) return;
    const otherUser = getOtherUser(activeChat);

    // Check if the other user is a seller/agent
    try {
      const otherUserDoc = await getDoc(doc(db, "users", otherUid));
      const otherRole = otherUserDoc.data()?.role;
      if (!otherRole || otherRole === 'Client') {
        glassToast.info("You can only rate sellers/agents.");
        return;
      }
    } catch { /* proceed */ }

    // Check for existing review
    let existingRating: Record<string, number> = {};
    try {
      const existingReview = await getDoc(doc(db, `users/${otherUid}/reviews`, user.uid));
      if (existingReview.exists()) {
        const data = existingReview.data();
        existingRating = data?.categories || {};
      }
    } catch { /* no existing */ }

    const categoriesHtml = RATING_CATEGORIES.map((cat, idx) => {
      const existing = existingRating[cat] || 0;
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
          <span style="font-size:0.85rem;font-weight:500;color:#374151;">${cat}</span>
          <div style="display:flex;gap:4px;" data-category="${idx}">
            ${[1,2,3,4,5].map(n => `<span class="rate-star" data-cat="${idx}" data-val="${n}" style="font-size:1.3rem;cursor:pointer;color:${n <= existing ? '#f59e0b' : '#9ca3af'};transition:color 0.15s;">★</span>`).join('')}
          </div>
        </div>
      `;
    }).join('');

    const { value: ratings } = await Swal.fire({
      title: `Rate ${otherUser.name}`,
      html: `<div style="text-align:left;margin-top:8px;">${categoriesHtml}</div><p id="rate-avg" style="font-size:0.8rem;color:#6b7280;margin-top:12px;">Overall: Select ratings above</p>`,
      showCancelButton: true, confirmButtonText: 'Submit Rating', confirmButtonColor: '#111827',
      width: '420px',
      didOpen: () => {
        const selected: Record<number, number> = {};
        // Init existing
        RATING_CATEGORIES.forEach((_, idx) => { if (existingRating[RATING_CATEGORIES[idx]]) selected[idx] = existingRating[RATING_CATEGORIES[idx]]; });
        const allStars = document.querySelectorAll('.rate-star');
        const avgLabel = document.getElementById('rate-avg');
        const updateAvg = () => {
          const vals = Object.values(selected);
          if (vals.length === 0) { if (avgLabel) avgLabel.textContent = 'Overall: Select ratings above'; return; }
          const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
          if (avgLabel) avgLabel.textContent = `Overall: ${avg} / 5.0 (${vals.length}/${RATING_CATEGORIES.length} rated)`;
        };
        updateAvg();
        allStars.forEach((s: any) => {
          s.addEventListener('click', () => {
            const cat = parseInt(s.dataset.cat);
            const val = parseInt(s.dataset.val);
            selected[cat] = val;
            // Update star colors for this category
            allStars.forEach((st: any) => {
              if (parseInt(st.dataset.cat) === cat) {
                st.style.color = parseInt(st.dataset.val) <= val ? '#f59e0b' : '#9ca3af';
              }
            });
            updateAvg();
            (Swal.getConfirmButton() as any).dataset.ratings = JSON.stringify(selected);
          });
        });
        if (Object.keys(selected).length > 0) {
          (Swal.getConfirmButton() as any).dataset.ratings = JSON.stringify(selected);
        }
      },
      preConfirm: () => {
        const raw = (Swal.getConfirmButton() as any)?.dataset?.ratings;
        if (!raw) { Swal.showValidationMessage('Please rate at least one category'); return false; }
        const parsed = JSON.parse(raw);
        if (Object.keys(parsed).length === 0) { Swal.showValidationMessage('Please rate at least one category'); return false; }
        return parsed;
      }
    });

    if (!ratings) return;

    try {
      // Convert index-based ratings to category-name-based
      const categories: Record<string, number> = {};
      Object.entries(ratings).forEach(([idx, val]) => {
        categories[RATING_CATEGORIES[parseInt(idx)]] = val as number;
      });
      const values = Object.values(categories);
      const overallRating = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;

      await setDoc(doc(db, `users/${otherUid}/reviews`, user.uid), {
        rating: overallRating,
        categories,
        reviewerId: user.uid,
        reviewerName: user.displayName || 'User',
        createdAt: new Date().toISOString()
      });

      // Update cached agentRating on user doc
      const allReviews = await getDocs(collection(db, `users/${otherUid}/reviews`));
      let total = 0;
      allReviews.forEach(d => { total += d.data().rating || 0; });
      const newAvg = Math.round((total / allReviews.size) * 10) / 10;
      await updateDoc(doc(db, "users", otherUid), { agentRating: newAvg });

      glassToast.success(`Rated ${otherUser.name} ${overallRating} stars!`);

      // Send notification
      await addDoc(collection(db, "notifications"), {
        recipientId: otherUid,
        message: `${user.displayName || 'Someone'} rated you ${overallRating} stars!`,
        link: '/profile',
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch { glassToast.error("Failed to submit rating."); }
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

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '80px 20px 20px 20px', gap: '16px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* LEFT SIDEBAR */}
        <div style={{ width: '350px', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', borderRadius: '20px', border: '1px solid #e5e7eb', display: activeChat ? 'none' : 'flex', flexDirection: 'column' }} className="chat-sidebar-mobile">
          <div className="msg-search-area" style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
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
            {isLoadingChats ? (
              <div style={{ padding: '10px' }}><SkeletonList rows={5} /></div>
            ) : filteredChats.length === 0 ? (
               <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>No conversations found.</div>
            ) : (
              filteredChats.map(chat => {
                const otherUser = getOtherUser(chat);
                const isActive = activeChat?.id === chat.id;
                const isUnread = chat.hasUnread?.[user?.uid];
                const otherUid = chat.participants.find((uid: string) => uid !== user?.uid);
                const isOnline = otherUid && isUserOnline(onlineStatuses[otherUid] || null);
                return (
                  <div key={chat.id} onClick={() => setActiveChat(chat)} className={`msg-chat-item ${isActive ? 'msg-chat-item-active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderRadius: '12px', cursor: 'pointer', marginBottom: '5px', background: isActive ? '#f3f4f6' : 'transparent' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img src={otherUser.avatar} alt="avatar" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
                      {isOnline && <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '12px', height: '12px', background: '#22c55e', borderRadius: '50%', border: '2px solid white' }} />}
                    </div>
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
              <div className="msg-chat-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '20px 20px 0 0' }}>
                <button className="chat-back-btn" onClick={() => setActiveChat(null)} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', display: 'none' }}><FaArrowLeft /></button>
                <img src={getOtherUser(activeChat).avatar} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{getOtherUser(activeChat).name}</h3>
                    <span style={{ fontSize: '0.75rem', color: isUserOnline(otherUserLastSeen) ? '#22c55e' : '#9ca3af' }}>
                      {isUserOnline(otherUserLastSeen) && <span style={{ display: 'inline-block', width: '7px', height: '7px', background: '#22c55e', borderRadius: '50%', marginRight: '5px' }} />}
                      {formatLastSeen(otherUserLastSeen)}
                    </span>
                </div>
                <button onClick={handleRateAgent} className="msg-rate-agent-btn" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '6px 14px', borderRadius: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#d97706', transition: '0.2s', flexShrink: 0 }} title="Rate this agent"><FaStar size={12} /> Rate</button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {messages.map((msg, index) => {
                  const isMe = msg.senderId === user?.uid;
                  const showDate = index === 0 || formatDateSeparator(messages[index-1].createdAt) !== formatDateSeparator(msg.createdAt);
                  
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div style={{ textAlign: 'center', margin: '12px 0', fontSize: '0.72rem', color: '#9ca3af' }}>
                            {formatDateSeparator(msg.createdAt)}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexDirection: isMe ? 'row' : 'row-reverse' }}>
                          {isMe && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="msg-delete-btn"
                              style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', padding: '4px', borderRadius: '4px', opacity: 0, transition: '0.2s' }}
                              title="Delete message"
                            >
                              <FaTrash size={11} />
                            </button>
                          )}
                          <div className={isMe ? 'msg-bubble-sent' : 'msg-bubble-received'} style={{ maxWidth: '100%', padding: msg.imageUrl ? '8px' : '12px 16px', borderRadius: '16px', borderBottomRightRadius: isMe ? '4px' : '16px', borderBottomLeftRadius: isMe ? '16px' : '4px' }}>
                          {msg.imageUrl ? (
                            <img src={msg.imageUrl} alt="Sent" style={{ width: '100%', borderRadius: '12px', display: 'block', cursor: 'pointer' }} onClick={() => window.open(msg.imageUrl, '_blank')} />
                          ) : (
                            <span style={{ fontSize: '0.95rem' }}>{DOMPurify.sanitize(msg.text)}</span>
                          )}
                        </div>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '2px', padding: '0 5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {formatTime(msg.createdAt)}
                            {isMe && (() => {
                              // Read receipt logic: check if other user read after this message was sent
                              const msgTime = msg.createdAt?.toDate ? msg.createdAt.toDate() : (msg.createdAt ? new Date(msg.createdAt) : null);
                              const otherReadTime = otherLastRead?.toDate ? otherLastRead.toDate() : (otherLastRead ? new Date(otherLastRead) : null);
                              if (msgTime && otherReadTime && otherReadTime >= msgTime) {
                                return <FaCheckDouble size={10} style={{ color: '#3b82f6' }} title="Read" />;
                              }
                              return <FaCheck size={10} style={{ color: '#9ca3af' }} title="Delivered" />;
                            })()}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {/* Typing indicator */}
                {isOtherTyping && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '4px' }}>
                    <div className="msg-bubble-received" style={{ padding: '10px 16px', borderRadius: '16px', borderBottomLeftRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9ca3af', animation: 'typingBounce 1.4s infinite ease-in-out', animationDelay: '0s' }} />
                      <span className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9ca3af', animation: 'typingBounce 1.4s infinite ease-in-out', animationDelay: '0.2s' }} />
                      <span className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9ca3af', animation: 'typingBounce 1.4s infinite ease-in-out', animationDelay: '0.4s' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="msg-input-area" style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', borderRadius: '0 0 20px 20px' }}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  
                  {/* Image Upload Button */}
                  <input type="file" ref={imageInputRef} hidden accept="image/*" onChange={handleImageSelect} />
                  <button type="button" onClick={() => imageInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                    {isUploading ? <FaSpinner className="spin" size={22} /> : <FaImage size={22} />}
                  </button>
                  
                  <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }} className="msg-input-field" style={{ flex: 1, padding: '12px 18px', borderRadius: '50px', outline: 'none' }} />
                  <button type="submit" disabled={!newMessage.trim() && !isUploading} className="msg-send-btn" style={{ border: 'none', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><FaPaperPlane size={14} /></button>
                </form>
              </div>
            </>
          ) : (
            <div className="msg-empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}><FaEnvelope size={48} style={{ marginBottom: '15px', opacity: 0.5 }} /><p>Select a conversation</p></div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @media (max-width: 768px) {
          .chat-sidebar-mobile { width: 100% !important; display: ${activeChat ? 'none' : 'flex'} !important; }
          .chat-window-mobile { display: ${activeChat ? 'flex' : 'none'} !important; }
        }
      `}</style>
    </div>
  );
}
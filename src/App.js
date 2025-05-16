import { useState, useEffect } from 'react';
import { Room, createLocalAudioTrack, Track } from 'livekit-client';

function App() {
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);

  const [formData, setFormData] = useState({
    bot_name: "Maya",
    bank_name: "ICICI Bank",
    customer_name: "Manish",
    reason: "your last 3 repayments have been missed",
    loan_type: "home",
    amount_disbursed: 5000000,
    principal_outstanding: 3500000,
    over_due_principal_amount: 3500000,
    over_due_interest_amount: 500000,
    over_due_total_amount: 4000000,
    over_due_days: 94,
  });

  useEffect(() => {
    if (!room) return;

    const handleTrackSubscribed = (track) => {
      if (track.kind === Track.Kind.Audio) {
        setIsSpeaking(true);
        const audioElement = track.attach();
        document.body.appendChild(audioElement);
        audioElement.onended = () => {
          setIsSpeaking(false);
          audioElement.remove();
        };
      }
    };

    const handleTrackUnsubscribed = (track) => {
      if (track.kind === Track.Kind.Audio) {
        track.detach().forEach(el => el.remove());
        setIsSpeaking(false);
      }
    };

    const handleDataReceived = (payload, participant) => {
      const message = new TextDecoder().decode(payload);
      setChatMessages(prev => [...prev, { sender: participant.identity, text: message }]);
    };

    room.on('trackSubscribed', handleTrackSubscribed);
    room.on('trackUnsubscribed', handleTrackUnsubscribed);
    room.on('dataReceived', handleDataReceived);

    return () => {
      room.off('trackSubscribed', handleTrackSubscribed);
      room.off('trackUnsubscribed', handleTrackUnsubscribed);
      room.off('dataReceived', handleDataReceived);
    };
  }, [room]);

  const connectToRoom = async () => {
    try {
      const userId = `user-${Math.random().toString(36).substring(2, 8)}`;
      const roomId = `room-${Math.random().toString(36).substring(2, 8)}`;

      const queryParams = new URLSearchParams({
        room: roomId,
        user: userId,
        ...formData,
      });

      const url = `${process.env.REACT_APP_TOKEN_SERVER_URL}/api/token/loan?${queryParams.toString()}`;
      const resp = await fetch(url);
      const data = await resp.json();

      const newRoom = new Room();
      await newRoom.connect(process.env.REACT_APP_LIVEKIT_WS_URL, data.token);
      setRoom(newRoom);
      setConnected(true);

      const micTrack = await createLocalAudioTrack();
      await newRoom.localParticipant.publishTrack(micTrack);
    } catch (err) {
      console.error('Error connecting to room:', err);
    }
  };

  const disconnectFromRoom = async () => {
    if (room) {
      await room.disconnect();
      setConnected(false);
      setRoom(null);
      setChatMessages([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Voice AI Loan Assistant</h1>

      {!connected && (
        <form onSubmit={(e) => { e.preventDefault(); connectToRoom(); }} style={styles.form}>
          <h2 style={styles.subheading}>Loan Details</h2>
          {Object.entries(formData).map(([key, value]) => (
            <div key={key} style={styles.formGroup}>
              <label htmlFor={key} style={styles.label}>
                {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}:
              </label>
              <input
                id={key}
                name={key}
                type="text"
                value={value}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          ))}

          <button type="submit" style={styles.startButton}>
            🎙️ Start Call
          </button>
        </form>
      )}

      {connected && (
        <div style={styles.sessionContainer}>
          <button onClick={disconnectFromRoom} style={styles.endButton}>
            🔴 End Call
          </button>

          {isSpeaking && <div style={styles.speakingIndicator}>🔊 Agent is speaking...</div>}

          <div style={styles.chatBox}>
            <h3 style={styles.chatTitle}>Chat Transcript</h3>
            <div style={styles.chatMessages}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={styles.chatMessage}>
                  <strong>{msg.sender}:</strong> {msg.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'center',
  },
  title: {
    marginBottom: '20px',
  },
  subheading: {
    marginBottom: '10px',
    fontSize: '20px',
    textAlign: 'left',
  },
  form: {
    border: '1px solid #ccc',
    borderRadius: '10px',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    textAlign: 'left',
  },
  formGroup: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
  },
  label: {
    flex: '0 0 220px',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  input: {
    flex: 1,
    padding: '8px',
    fontSize: '14px',
    borderRadius: '5px',
    border: '1px solid #ccc',
  },
  startButton: {
    marginTop: '20px',
    padding: '12px 25px',
    fontSize: '16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  sessionContainer: {
    marginTop: '30px',
  },
  endButton: {
    padding: '12px 25px',
    fontSize: '16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  speakingIndicator: {
    marginTop: '20px',
    fontWeight: 'bold',
    fontSize: '18px',
    color: 'green',
  },
  chatBox: {
    marginTop: '30px',
    border: '1px solid #ccc',
    borderRadius: '10px',
    padding: '20px',
    textAlign: 'left',
    backgroundColor: '#ffffff',
  },
  chatTitle: {
    marginBottom: '10px',
  },
  chatMessages: {
    maxHeight: '300px',
    overflowY: 'auto',
  },
  chatMessage: {
    marginBottom: '10px',
    lineHeight: '1.4',
  },
};

export default App;

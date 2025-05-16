import { useState, useEffect } from 'react';
import { Room, createLocalAudioTrack, Track } from 'livekit-client';

function App() {
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);

  // Form state
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

    const handleTrackSubscribed = (track, publication, participant) => {
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
        track.detach().forEach((el) => el.remove());
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

      const fullUrl = `${process.env.REACT_APP_TOKEN_SERVER_URL}/api/token/loan?${queryParams.toString()}`;
      const resp = await fetch(fullUrl);
      const data = await resp.json();
      const token = data.token;

      const newRoom = new Room();
      await newRoom.connect(process.env.REACT_APP_LIVEKIT_WS_URL, token);
      setRoom(newRoom);
      setConnected(true);

      const micTrack = await createLocalAudioTrack();
      await newRoom.localParticipant.publishTrack(micTrack);

    } catch (err) {
      console.error('Error connecting:', err);
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
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Voice AI Loan Bot</h1>

      {!connected && (
        <form onSubmit={e => { e.preventDefault(); connectToRoom(); }}>
          <h3>Loan Details</h3>
          {Object.entries(formData).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '10px' }}>
              <label style={{ marginRight: '10px' }}>{key.replace(/_/g, ' ')}:</label>
              <input
                type="text"
                name={key}
                value={value}
                onChange={handleChange}
                style={{ padding: '5px', width: '300px' }}
              />
            </div>
          ))}
          <button type="submit" style={{ padding: '10px 20px', fontSize: '16px' }}>
            Start Call
          </button>
        </form>
      )}

      {connected && (
        <>
          <button onClick={disconnectFromRoom} style={{ marginTop: '20px', padding: '10px 20px' }}>
            End Call
          </button>

          {isSpeaking && (
            <div style={{ marginTop: '20px', fontWeight: 'bold', fontSize: '20px', color: 'green' }}>
              🔊 Agent is speaking...
            </div>
          )}

          <div style={{
            marginTop: '40px',
            border: '1px solid gray',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <h3>Chat Transcript</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx}><b>{msg.sender}:</b> {msg.text}</div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;

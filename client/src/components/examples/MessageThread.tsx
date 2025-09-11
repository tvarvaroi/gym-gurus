import MessageThread from '../MessageThread'

export default function MessageThreadExample() {
  // todo: remove mock functionality
  const sampleMessages = [
    {
      id: "1",
      senderId: "client1", 
      senderName: "Sarah Johnson",
      content: "Hi! I completed yesterday's workout. The squats felt great!",
      timestamp: "10:30 AM",
      isTrainer: false
    },
    {
      id: "2",
      senderId: "trainer1",
      senderName: "Trainer",
      content: "That's awesome! How did your knees feel during the movement?",
      timestamp: "10:35 AM", 
      isTrainer: true
    },
    {
      id: "3",
      senderId: "client1",
      senderName: "Sarah Johnson", 
      content: "Much better than last week. No pain at all. Should I increase the weight next time?",
      timestamp: "10:37 AM",
      isTrainer: false
    },
    {
      id: "4",
      senderId: "trainer1",
      senderName: "Trainer",
      content: "Perfect! Let's add 5 more pounds for next session. Keep focusing on form over speed.",
      timestamp: "10:40 AM",
      isTrainer: true
    }
  ]

  return (
    <div className="max-w-md mx-auto p-6">
      <MessageThread
        clientName="Sarah Johnson"
        messages={sampleMessages}
        unreadCount={2}
      />
    </div>
  )
}
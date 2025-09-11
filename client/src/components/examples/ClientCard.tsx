import ClientCard from '../ClientCard'

export default function ClientCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      <ClientCard
        name="Sarah Johnson"
        email="sarah.j@email.com"
        goal="Lose 20 lbs and build muscle"
        progress={78}
        lastSession="2 days ago"
        status="active"
        nextSession="Tomorrow 3:00 PM"
      />
      <ClientCard
        name="Mike Chen"
        email="mike.chen@email.com"
        goal="Marathon training preparation"
        progress={92}
        lastSession="Yesterday"
        status="active"
        nextSession="Friday 6:00 AM"
      />
      <ClientCard
        name="Emma Davis"
        email="emma.davis@email.com"
        goal="Post-injury rehabilitation"
        progress={45}
        lastSession="5 days ago"
        status="paused"
      />
    </div>
  )
}
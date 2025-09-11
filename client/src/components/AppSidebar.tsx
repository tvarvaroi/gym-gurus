import { Calendar, Dumbbell, Home, MessageSquare, Users, TrendingUp, BookOpen } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import logoImage from '@assets/generated_images/Gym_Gurus_fitness_logo_194e0826.png'

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "My Clients", 
    url: "/clients",
    icon: Users,
  },
  {
    title: "Workout Plans",
    url: "/workouts", 
    icon: Dumbbell,
  },
  {
    title: "Progress Tracking",
    url: "/progress",
    icon: TrendingUp,
  },
  {
    title: "Exercise Library",
    url: "/exercises",
    icon: BookOpen,
  },
  {
    title: "Messages",
    url: "/messages",
    icon: MessageSquare,
  },
  {
    title: "Schedule",
    url: "/schedule",
    icon: Calendar,
  },
]

export default function AppSidebar() {
  return (
    <Sidebar className="border-r border-border/50 bg-sidebar/95 backdrop-blur-xl">
      <SidebarContent className="pt-8">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-8 px-4">
            <div className="flex items-center gap-3">
              <img 
                src={logoImage} 
                alt="Gym Gurus" 
                className="w-10 h-10 rounded-lg bg-primary/10 p-2"
              />
              <div className="flex flex-col">
                <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                  GYM
                </span>
                <span className="text-lg font-light tracking-wider text-muted-foreground -mt-1">
                  GURUS
                </span>
              </div>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className="h-11 px-4 font-light hover:bg-sidebar-accent/50 rounded-xl transition-all duration-200 hover:border-primary/20"
                  >
                    <a href={item.url} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
                      <item.icon className="h-5 w-5 opacity-80" />
                      <span className="text-base">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
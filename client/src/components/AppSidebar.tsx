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
import { motion } from "framer-motion"
import { useState } from "react"
import { useLocation } from "wouter"

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
  const [location] = useLocation()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  // Premium animation variants
  const logoVariants = {
    initial: { scale: 1, rotate: 0 },
    hover: { 
      scale: 1.05, 
      rotate: 1,
      transition: { 
        type: "spring", 
        damping: 15, 
        stiffness: 300 
      } 
    }
  }

  const menuItemVariants = {
    initial: { 
      x: 0, 
      scale: 1
    },
    hover: { 
      x: 6, 
      scale: 1.02,
      transition: { 
        type: "spring", 
        damping: 20, 
        stiffness: 400
      } 
    },
    active: {
      x: 8,
      scale: 1.02,
      transition: { 
        type: "spring", 
        damping: 20, 
        stiffness: 400 
      }
    }
  }

  const iconVariants = {
    initial: { rotate: 0, scale: 1 },
    hover: { 
      rotate: 5, 
      scale: 1.1,
      transition: { 
        type: "spring", 
        damping: 15, 
        stiffness: 300 
      } 
    }
  }

  const isActive = (url: string) => location === url

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar/95 backdrop-blur-xl">
      <SidebarContent className="pt-8">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-8 px-4">
            <motion.div 
              className="flex items-center gap-3 cursor-pointer"
              variants={logoVariants}
              initial="initial"
              whileHover="hover"
            >
              <motion.img 
                src={logoImage} 
                alt="Gym Gurus" 
                className="w-10 h-10 rounded-lg bg-primary/10 p-2"
                whileHover={{ rotate: 10, scale: 1.1 }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
              />
              <div className="flex flex-col">
                <motion.span 
                  className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                >
                  GYM
                </motion.span>
                <span className="text-lg font-light tracking-wider text-muted-foreground -mt-1">
                  GURUS
                </span>
              </div>
            </motion.div>
          </SidebarGroupLabel>
          
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item, index) => {
                const active = isActive(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <motion.div
                      variants={menuItemVariants}
                      initial="initial"
                      animate={active ? "active" : "initial"}
                      whileHover="hover"
                      onHoverStart={() => setHoveredItem(item.title)}
                      onHoverEnd={() => setHoveredItem(null)}
                      className={`relative rounded-xl overflow-hidden transition-colors duration-200 ${
                        hoveredItem === item.title ? 'bg-muted/30' : active ? 'bg-muted/50' : 'bg-transparent'
                      }`}
                      style={{
                        transformOrigin: "left center"
                      }}
                    >
                      {/* Animated background indicator */}
                      <motion.div
                        className="absolute left-0 top-0 w-1 h-full bg-primary rounded-r-full"
                        initial={{ scaleY: 0 }}
                        animate={{ 
                          scaleY: active ? 1 : (hoveredItem === item.title ? 0.6 : 0),
                          opacity: active ? 1 : (hoveredItem === item.title ? 0.7 : 0)
                        }}
                        transition={{ 
                          type: "spring", 
                          damping: 20, 
                          stiffness: 400,
                          delay: index * 0.05
                        }}
                        style={{ transformOrigin: "center" }}
                      />
                      
                      <SidebarMenuButton 
                        asChild
                        className={`h-11 px-4 font-light rounded-xl transition-all duration-200 border-0 ${
                          active 
                            ? 'bg-primary/10 text-primary' 
                            : 'hover:bg-transparent'
                        }`}
                      >
                        <a href={item.url} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
                          <motion.div
                            variants={iconVariants}
                            initial="initial"
                            animate={hoveredItem === item.title ? "hover" : "initial"}
                          >
                            <item.icon className={`h-5 w-5 ${active ? 'opacity-100' : 'opacity-80'}`} />
                          </motion.div>
                          <motion.span 
                            className={`text-base transition-colors duration-200 ${
                              active ? 'font-medium text-primary' : 'font-light text-foreground'
                            }`}
                            animate={{
                              fontWeight: active ? 500 : 300
                            }}
                            transition={{ duration: 0.2 }}
                          >
                            {item.title}
                          </motion.span>
                        </a>
                      </SidebarMenuButton>
                    </motion.div>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
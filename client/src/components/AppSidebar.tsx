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
import logoImage from '@assets/Sophisticated Logo with Japanese Influences (3)_1757605872884.png'
import { motion } from "framer-motion"
import { useState, memo } from "react"
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

const AppSidebar = memo(() => {
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

  const isActive = (url: string) => {
    // Handle both "/" and "/dashboard" for the Dashboard route
    if (url === '/' && (location === '/' || location === '/dashboard')) return true
    // Handle exact match for other routes
    return location === url
  }

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
                className="w-20 h-20 rounded-lg"
                whileHover={{ rotate: 3, scale: 1.05 }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
                style={{ filter: 'brightness(1.1)' }}
              />
              <div className="flex flex-col">
                <motion.span 
                  className="text-2xl font-normal tracking-wide text-foreground"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    letterSpacing: '0.2em',
                    fontWeight: '400'
                  }}
                >
                  GYM GURUS
                </motion.span>
                <div className="w-full h-px bg-primary my-2"></div>
                <span className="text-sm font-normal tracking-widest text-muted-foreground/80" 
                      style={{ letterSpacing: '0.2em' }}>
                  Fitness Services
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
})

AppSidebar.displayName = "AppSidebar"

export default AppSidebar
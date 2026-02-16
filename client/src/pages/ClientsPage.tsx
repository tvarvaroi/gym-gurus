import { useState, useMemo, useCallback, Suspense, memo } from "react";
import { Button } from "@/components/ui/button";
import { Download, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/AnimationComponents";
import { QueryErrorState } from "@/components/query-states/QueryErrorState";
import { exportClientsToCSV } from "@/lib/exportUtils";
import ClientCard from "@/components/ClientCard";
import SearchInput from "@/components/SearchInput";
import { NewClientButton } from "@/components/ClientFormModal";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const ClientsPageContent = memo(() => {
  const prefersReducedMotion = useReducedMotion();
  const queryClient = useQueryClient();

  // Get the authenticated user's ID from the auth system
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Use authenticated user's ID or fallback to demo ID
  const trainerId = (user as any)?.id || "demo-trainer-123";
  const [searchQuery, setSearchQuery] = useState("");

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['/api/clients', trainerId],
    queryFn: () => fetch(`/api/clients/${trainerId}`).then(res => res.json()),
    enabled: !!trainerId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Helper function to format session times
  const formatSessionTime = useCallback((timestamp: string | null) => {
    if (!timestamp) return "No session yet";
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Yesterday";
    if (diffDays === 0) return "Today";
    return `${diffDays} days ago`;
  }, []);

  // Transform database client data to match ClientCard props
  const transformedClients = useMemo(() => {
    const allClients = (clients || []).map((client: any) => ({
      ...client,
      client: client,
      trainerId: trainerId,
      progress: client.status === 'active' ? 75 : client.status === 'paused' ? 40 : 10,
      lastSession: formatSessionTime(client.lastSession),
      nextSession: client.nextSession ? new Date(client.nextSession).toLocaleDateString() : undefined
    }));

    if (!searchQuery.trim()) return allClients;

    const query = searchQuery.toLowerCase();
    return allClients.filter((client: any) =>
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.goal?.toLowerCase().includes(query) ||
      client.status.toLowerCase().includes(query)
    );
  }, [clients, searchQuery, formatSessionTime, trainerId]);

  // Show loading state
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl font-extralight tracking-tight">
                My <span className="font-light bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">Clients</span>
              </h1>
              <p className="text-base font-light text-muted-foreground/80 flex items-center gap-2">
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
                >
                  Loading client data...
                </motion.span>
              </p>
            </motion.div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="h-80 glass-strong rounded-2xl overflow-hidden relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear", delay: i * 0.1 }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </PageTransition>
    );
  }

  // Show error state
  if (error) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <QueryErrorState
            error={error}
            title="Failed to load clients"
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['/api/clients', trainerId] })}
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              >
                <h1 className="text-4xl md:text-5xl font-extralight tracking-tight">
                  My <span className="font-light bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">Clients</span>
                </h1>
                <p className="text-base font-light text-muted-foreground/80">Manage and track your client progress with precision</p>
              </motion.div>
              <motion.div
                className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
              >
                <NewClientButton trainerId={trainerId} className="w-full sm:w-auto shadow-premium hover:shadow-premium-lg transition-all duration-300" />
                <Button
                  variant="outline"
                  onClick={() => exportClientsToCSV(clients || [])}
                  disabled={!clients?.length}
                  data-testid="button-export-clients"
                  className="relative w-full sm:w-auto border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <Download className="mr-2 h-4 w-4 relative z-10" />
                  <span className="text-sm relative z-10">Export to CSV</span>
                </Button>
              </motion.div>
            </div>
            <div className="w-full md:w-80">
              <Suspense fallback={
                <motion.div
                  className="h-10 glass rounded-md overflow-hidden relative"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear" }}
                  />
                </motion.div>
              }>
                <SearchInput
                  placeholder="Search clients by name, email, goal..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  debounceMs={300}
                  className="w-full"
                />
              </Suspense>
            </div>
          </div>
        </StaggerItem>

        <StaggerContainer delay={0.2}>
          {transformedClients.length === 0 ? (
            <motion.div
              className="text-center py-20 space-y-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="relative inline-block">
                <motion.div
                  className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
                >
                  <Users className="h-12 w-12 text-primary/60" />
                </motion.div>
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-xl"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-light">No clients yet</h3>
                <p className="text-base font-light text-muted-foreground/80 max-w-md mx-auto">
                  Start building your fitness community by adding your first client
                </p>
              </div>
              <NewClientButton trainerId={trainerId} className="mx-auto shadow-premium hover:shadow-premium-lg transition-all duration-300" />
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {transformedClients.map((client: any, index: number) => (
                <StaggerItem key={client.email} index={index}>
                  <Suspense fallback={
                    <motion.div
                      className="h-80 glass-strong rounded-2xl overflow-hidden relative"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear" }}
                      />
                    </motion.div>
                  }>
                    <ClientCard {...client} />
                  </Suspense>
                </StaggerItem>
              ))}
            </div>
          )}
        </StaggerContainer>
      </div>
    </PageTransition>
  );
});

export default ClientsPageContent;

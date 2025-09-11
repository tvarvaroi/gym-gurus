import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, MessageSquare } from "lucide-react";
import { MessageTemplate } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

const TEMPLATE_CATEGORIES = [
  { value: 'workout_reminder', label: 'Workout Reminders' },
  { value: 'motivation', label: 'Motivation' },
  { value: 'check_in', label: 'Check-ins' },
  { value: 'general', label: 'General' }
];

interface MessageTemplateManagerProps {
  onTemplateSelect?: (template: MessageTemplate) => void;
}

export default function MessageTemplateManager({ onTemplateSelect }: MessageTemplateManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [newTemplate, setNewTemplate] = useState({
    title: "",
    content: "",
    category: "general",
    platform: "all"
  });
  const queryClient = useQueryClient();

  // Fetch authenticated user
  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch authenticated user');
      return response.json();
    }
  });

  // Fetch templates using authenticated trainer ID
  const { data: templates = [], isLoading } = useQuery<MessageTemplate[]>({
    queryKey: ['/api/trainers', user?.id, 'message-templates', selectedCategory],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      const url = selectedCategory 
        ? `/api/trainers/${user.id}/message-templates?category=${selectedCategory}`
        : `/api/trainers/${user.id}/message-templates`;
      const response = await fetch(url, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
    enabled: !!user?.id
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      if (!user?.id) throw new Error('User not authenticated');
      const response = await fetch('/api/message-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...templateData,
          trainerId: user.id
        })
      });
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/trainers', user.id, 'message-templates'] });
      }
      setShowCreateDialog(false);
      setNewTemplate({ title: "", content: "", category: "general", platform: "all" });
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`/api/message-templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete template');
      return response.json();
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/trainers', user.id, 'message-templates'] });
      }
    }
  });

  const handleCreateTemplate = () => {
    if (!newTemplate.title.trim() || !newTemplate.content.trim()) return;
    createTemplateMutation.mutate(newTemplate);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(templateId);
    }
  };

  const filteredTemplates = templates.filter(template => 
    !selectedCategory || template.category === selectedCategory
  );

  const groupedTemplates = TEMPLATE_CATEGORIES.reduce((acc, category) => {
    acc[category.value] = filteredTemplates.filter(t => t.category === category.value);
    return acc;
  }, {} as Record<string, MessageTemplate[]>);

  // Handle authentication errors
  if (userError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive mb-4">Authentication required</p>
            <p className="text-muted-foreground">Please log in to manage message templates</p>
            <Button 
              className="mt-4" 
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while fetching user
  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading user information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Message Templates</h2>
          <p className="text-muted-foreground">Create and manage quick response templates</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Message Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Template name"
                  value={newTemplate.title}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                  data-testid="input-template-title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select 
                  value={newTemplate.category} 
                  onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger data-testid="select-template-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Platform</label>
                <Select 
                  value={newTemplate.platform} 
                  onValueChange={(value) => setNewTemplate(prev => ({ ...prev, platform: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="app">App Only</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Message Content</label>
                <Textarea
                  placeholder="Type your template message..."
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                  className="min-h-24"
                  data-testid="textarea-template-content"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTemplate}
                  disabled={!newTemplate.title.trim() || !newTemplate.content.trim() || createTemplateMutation.isPending}
                  data-testid="button-save-template"
                >
                  Create Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Filter */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Filter by category:</span>
        <div className="flex items-center space-x-2">
          <Button
            variant={selectedCategory === "" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("")}
          >
            All
          </Button>
          {TEMPLATE_CATEGORIES.map(category => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Templates by Category */}
      <div className="space-y-6">
        {TEMPLATE_CATEGORIES.map(category => {
          const categoryTemplates = groupedTemplates[category.value] || [];
          if (selectedCategory && selectedCategory !== category.value) return null;
          if (categoryTemplates.length === 0 && selectedCategory === category.value) {
            return (
              <Card key={category.value}>
                <CardContent className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No templates in this category yet</p>
                </CardContent>
              </Card>
            );
          }
          if (categoryTemplates.length === 0) return null;

          return (
            <div key={category.value}>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                {category.label}
                <Badge variant="secondary" className="ml-2">
                  {categoryTemplates.length}
                </Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {categoryTemplates.map((template) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Card className="h-full hover-elevate cursor-pointer" data-testid={`template-${template.id}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{template.title}</CardTitle>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {template.platform === 'all' ? 'All Platforms' : template.platform}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onTemplateSelect) {
                                    onTemplateSelect(template);
                                  }
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTemplate(template.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {template.content}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      )}
    </div>
  );
}
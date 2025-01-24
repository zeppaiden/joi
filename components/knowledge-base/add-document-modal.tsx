"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/use-organization";
import type { Database } from "@/types/supabase";

type DocumentCategory = Database["public"]["Enums"]["document_category"];

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddDocumentModal({ isOpen, onClose }: AddDocumentModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const { organization } = useOrganization();
  const supabase = createClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !organization || !selectedCategory) return;

    setIsUploading(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const title = formData.get('title') as string;
      const description = formData.get('description') as string;

      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${organization.id}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get user information
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not found');

      // Create document record in database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          title,
          description,
          category: selectedCategory,
          file_path: filePath,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          organization_id: organization.id,
          uploaded_by: user.id
        });

      if (dbError) throw dbError;

      toast({
        title: "Document uploaded successfully",
        description: "Your document has been added to the knowledge base.",
      });

      // Reset form and close modal
      formRef.current?.reset();
      setSelectedFile(null);
      setSelectedCategory(null);
      onClose();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error uploading document",
        description: "There was a problem uploading your document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Document</DialogTitle>
          <DialogDescription>
            Upload a document to your organization's knowledge base.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          {/* Document Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Enter document title"
              required
            />
          </div>

          {/* Document Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Enter a brief description of the document"
              required
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              name="category" 
              required
              value={selectedCategory || ""}
              onValueChange={(value) => setSelectedCategory(value as DocumentCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manuals">Manuals</SelectItem>
                <SelectItem value="how-to">How-to Guides</SelectItem>
                <SelectItem value="faqs">FAQs</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Document File</Label>
            <div className="flex items-center gap-4">
              <input
                id="file"
                name="file"
                type="file"
                onChange={handleFileSelect}
                required
                accept=".pdf,.doc,.docx,.txt,.md"
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => document.getElementById('file')?.click()}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>
            {selectedFile ? (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {selectedFile.name}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">
                No file chosen
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
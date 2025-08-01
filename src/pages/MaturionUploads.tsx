import { UnifiedDocumentUploader } from "@/components/ai";
import { SecurityDashboard } from "@/components/security/SecurityDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MaturionUploads() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Intelligence System</h1>
        <p className="text-muted-foreground">
          Unified document ingestion with enhanced security monitoring and quality assurance
        </p>
      </div>
      
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">Document Upload</TabsTrigger>
          <TabsTrigger value="security">Security Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <UnifiedDocumentUploader 
            onUploadComplete={(results) => {
              console.log('Upload completed:', results);
            }}
            maxFiles={10}
            allowedFileTypes={['pdf', 'docx', 'txt', 'md']}
          />
          
          {/* Reserved space for Phase 2 QA widgets and status tracker */}
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center text-muted-foreground">
            <p className="text-sm">Phase 2: QA Dashboard & Status Tracker</p>
            <p className="text-xs mt-1">Coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <SecurityDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
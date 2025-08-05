import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Building, Copy, AlertTriangle, CheckCircle, Eye } from 'lucide-react';

interface CrossOrgData {
  id: string;
  source_organization_id: string;
  target_organization_id: string;
  tracking_type: string;
  content_hash: string;
  similarity_score: number;
  flagged_for_review: boolean;
  review_status: string;
  action_taken: string;
  created_at: string;
}

export const CrossOrgTracker: React.FC = () => {
  const [trackingData, setTrackingData] = useState<CrossOrgData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin } = useAdminAccess();

  useEffect(() => {
    if (isAdmin) {
      loadTrackingData();
    }
  }, [isAdmin]);

  const loadTrackingData = async () => {
    try {
      const { data } = await supabase
        .from('cross_org_tracking')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      setTrackingData(data || []);
    } catch (error) {
      console.error('Error loading cross-org tracking data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateReviewStatus = async (trackingId: string, status: string, action?: string) => {
    try {
      const updateData: any = {
        review_status: status,
        reviewed_at: new Date().toISOString()
      };

      if (action) {
        updateData.action_taken = action;
      }

      await supabase
        .from('cross_org_tracking')
        .update(updateData)
        .eq('id', trackingId);

      loadTrackingData();
    } catch (error) {
      console.error('Error updating review status:', error);
    }
  };

  const getTrackingIcon = (type: string) => {
    switch (type) {
      case 'duplicate_upload': return <Copy className="h-4 w-4" />;
      case 'similar_content': return <Building className="h-4 w-4" />;
      case 'cross_reference': return <Eye className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.9) return 'bg-red-500 text-white';
    if (score >= 0.7) return 'bg-orange-500 text-white';
    if (score >= 0.5) return 'bg-yellow-500 text-black';
    return 'bg-green-500 text-white';
  };

  const getReviewStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-red-100 text-red-800';
      case 'false_positive': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cross-Organization Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Admin access required to view cross-organization data.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cross-Organization Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Cross-Organization Tracker
        </CardTitle>
        <CardDescription>
          Monitor duplicate uploads and similar content across organizations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trackingData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No cross-organization tracking data found
            </p>
          ) : (
            trackingData.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTrackingIcon(item.tracking_type)}
                    <span className="font-medium capitalize">
                      {item.tracking_type.replace('_', ' ')}
                    </span>
                    {item.similarity_score && (
                      <Badge className={getSimilarityColor(item.similarity_score)}>
                        {(item.similarity_score * 100).toFixed(0)}% Similar
                      </Badge>
                    )}
                    <Badge className={getReviewStatusColor(item.review_status)}>
                      {item.review_status.replace('_', ' ')}
                    </Badge>
                    {item.flagged_for_review && (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Source Org:</span>
                    <p className="font-mono text-xs">
                      {item.source_organization_id.slice(0, 8)}...
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Target Org:</span>
                    <p className="font-mono text-xs">
                      {item.target_organization_id ? 
                        `${item.target_organization_id.slice(0, 8)}...` : 
                        'Multiple'
                      }
                    </p>
                  </div>
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Content Hash:</span>
                  <p className="font-mono text-xs">{item.content_hash}</p>
                </div>

                {item.action_taken && (
                  <div className="bg-muted rounded p-2">
                    <span className="text-sm font-medium">Action Taken:</span>
                    <p className="text-sm text-muted-foreground">{item.action_taken}</p>
                  </div>
                )}

                {item.review_status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateReviewStatus(item.id, 'confirmed', 'Marked as legitimate duplicate')}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Confirm Duplicate
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateReviewStatus(item.id, 'false_positive', 'Marked as false positive')}
                    >
                      False Positive
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {trackingData.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Pending Review:</span>
                <p className="font-medium">
                  {trackingData.filter(item => item.review_status === 'pending').length}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Confirmed Duplicates:</span>
                <p className="font-medium">
                  {trackingData.filter(item => item.review_status === 'confirmed').length}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">False Positives:</span>
                <p className="font-medium">
                  {trackingData.filter(item => item.review_status === 'false_positive').length}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
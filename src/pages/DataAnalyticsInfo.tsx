import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LineChart, ArrowRight } from "lucide-react";

const DataAnalyticsInfo = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Data Analytics & Assurance</h1>
        <p className="text-xl text-muted-foreground">
          AI-driven insights from access control, video surveillance, and operational data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-6 w-6" />
            Data Analytics Module
          </CardTitle>
          <CardDescription>
            Advanced analytics for security and operational intelligence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This module is currently under development. Subscribe to get notified when it becomes available.
          </p>
          <Button onClick={() => navigate('/subscribe')}>
            Subscribe to Access
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataAnalyticsInfo;

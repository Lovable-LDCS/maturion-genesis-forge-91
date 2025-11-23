import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Wrench, ArrowRight } from "lucide-react";

const PITInfo = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Project Implementation</h1>
        <p className="text-xl text-muted-foreground">
          Streamline security project planning, execution, and delivery
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Project Implementation Module
          </CardTitle>
          <CardDescription>
            Tools and frameworks for successful security project delivery
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

export default PITInfo;

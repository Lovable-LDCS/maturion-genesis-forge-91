import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { GraduationCap, ArrowRight } from "lucide-react";

const SkillsDevelopmentInfo = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Skills Development Portal</h1>
        <p className="text-xl text-muted-foreground">
          Upskill your security team with globally recognized training and certification programs
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Skills Development Module
          </CardTitle>
          <CardDescription>
            Professional development and certification tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This module is currently under development. Subscribe to get notified when it becomes available.
          </p>
          <p className="text-sm text-muted-foreground">
            Powered by APGI - Global Security Professional Track
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

export default SkillsDevelopmentInfo;

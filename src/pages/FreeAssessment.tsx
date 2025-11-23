import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, ArrowRight } from "lucide-react";

const FreeAssessment = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Free Maturity Assessment</h1>
        <p className="text-xl text-muted-foreground">
          Complete our comprehensive 15-minute assessment and receive instant insights into your organization's security maturity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            Get Started with Your Free Assessment
          </CardTitle>
          <CardDescription>
            Understand your current maturity level across six operational domains
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Our free assessment evaluates your organization across:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Leadership & Governance</li>
            <li>Process Integrity</li>
            <li>People & Culture</li>
            <li>Protection</li>
            <li>Proof it Works</li>
            <li>Performance</li>
          </ul>
          <div className="pt-4">
            <Button onClick={() => navigate('/assessment')} className="w-full">
              Start Free Assessment
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FreeAssessment;

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  Shield,
  Users,
  ClipboardList,
  CheckCircle2,
  Activity,
  ArrowRight,
  CheckCircle,
  Circle,
} from "lucide-react";

interface WorkflowPhase {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: "completed" | "in-progress" | "pending";
  icon: React.ComponentType<{ className?: string }>;
  routes: string[];
  actions: { label: string; route: string }[];
}

const workflowPhases: WorkflowPhase[] = [
  {
    id: "setup",
    name: "Phase 1: Initial Setup & Configuration",
    description: "Establish foundational organizational structure and admin access",
    progress: 75,
    status: "in-progress",
    icon: Settings,
    routes: ["/admin/config", "/organization/settings", "/team"],
    actions: [
      { label: "Admin Config", route: "/admin/config" },
      { label: "Org Settings", route: "/organization/settings" },
      { label: "Team Setup", route: "/team" },
    ],
  },
  {
    id: "framework",
    name: "Phase 2: Assessment Framework Definition",
    description: "Configure assessment criteria and maturity framework",
    progress: 60,
    status: "in-progress",
    icon: Shield,
    routes: ["/assessment/framework", "/maturity/setup", "/maturion/knowledge-base"],
    actions: [
      { label: "Framework Config", route: "/assessment/framework" },
      { label: "Maturity Setup", route: "/maturity/setup" },
      { label: "Knowledge Base", route: "/maturion/knowledge-base" },
    ],
  },
  {
    id: "team",
    name: "Phase 3: Team & Access Management",
    description: "Invite team members and configure access controls",
    progress: 40,
    status: "in-progress",
    icon: Users,
    routes: ["/team", "/admin/config"],
    actions: [
      { label: "Invite Team", route: "/team" },
      { label: "Access Config", route: "/admin/config" },
    ],
  },
  {
    id: "assessment",
    name: "Phase 4: Assessment Execution",
    description: "Conduct maturity assessments and gather evidence",
    progress: 0,
    status: "pending",
    icon: ClipboardList,
    routes: ["/assessment", "/dashboard", "/modules"],
    actions: [
      { label: "Start Assessment", route: "/assessment" },
      { label: "View Dashboard", route: "/dashboard" },
      { label: "Browse Modules", route: "/modules" },
    ],
  },
  {
    id: "review",
    name: "Phase 5: Review & Sign-Off",
    description: "Review assessment results and obtain approvals",
    progress: 0,
    status: "pending",
    icon: CheckCircle2,
    routes: ["/qa-signoff", "/qa-dashboard", "/admin/health-checker"],
    actions: [
      { label: "QA Sign-Off", route: "/qa-signoff" },
      { label: "QA Dashboard", route: "/qa-dashboard" },
      { label: "Health Check", route: "/admin/health-checker" },
    ],
  },
  {
    id: "monitoring",
    name: "Phase 6: Continuous Monitoring",
    description: "Monitor ongoing compliance and maturity improvements",
    progress: 0,
    status: "pending",
    icon: Activity,
    routes: ["/watchdog", "/journey", "/dashboard"],
    actions: [
      { label: "Watchdog", route: "/watchdog" },
      { label: "Journey", route: "/journey" },
    ],
  },
];

export default function AdminWorkflowDashboard() {
  const navigate = useNavigate();

  const overallProgress = Math.round(
    workflowPhases.reduce((sum, phase) => sum + phase.progress, 0) / workflowPhases.length
  );

  const currentPhase = workflowPhases.find(
    (phase) => phase.status === "in-progress"
  ) || workflowPhases[0];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">ISMS Workflow Dashboard</h1>
        <p className="text-muted-foreground">
          Track your Integrated Security Management System implementation progress
        </p>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
          <CardDescription>
            Complete all workflow phases to fully implement your ISMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Completion</span>
              <span className="font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {workflowPhases.filter((p) => p.status === "completed").length}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {workflowPhases.filter((p) => p.status === "in-progress").length}
              </div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-400">
                {workflowPhases.filter((p) => p.status === "pending").length}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Phase Highlight */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="default">Current Phase</Badge>
            <CardTitle className="text-lg">{currentPhase.name}</CardTitle>
          </div>
          <CardDescription>{currentPhase.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Phase Progress</span>
              <span className="font-medium">{currentPhase.progress}%</span>
            </div>
            <Progress value={currentPhase.progress} className="h-2" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {currentPhase.actions.map((action) => (
              <Button
                key={action.route}
                variant="default"
                size="sm"
                onClick={() => navigate(action.route)}
              >
                {action.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Phases */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Workflow Phases</h2>
        <div className="space-y-3">
          {workflowPhases.map((phase, index) => {
            const PhaseIcon = phase.icon;
            const StatusIcon = phase.status === "completed" ? CheckCircle : Circle;
            
            return (
              <Card
                key={phase.id}
                className={`transition-all ${
                  phase.status === "in-progress"
                    ? "border-blue-300 shadow-md"
                    : phase.status === "completed"
                    ? "border-green-200 bg-green-50/30"
                    : "border-gray-200 bg-gray-50/30"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`p-2 rounded-lg ${
                          phase.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : phase.status === "in-progress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        <PhaseIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <StatusIcon
                            className={`h-4 w-4 ${
                              phase.status === "completed"
                                ? "text-green-600 fill-green-600"
                                : phase.status === "in-progress"
                                ? "text-blue-600"
                                : "text-gray-300"
                            }`}
                          />
                          <CardTitle className="text-base">{phase.name}</CardTitle>
                        </div>
                        <CardDescription className="mt-1">
                          {phase.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant={
                        phase.status === "completed"
                          ? "default"
                          : phase.status === "in-progress"
                          ? "default"
                          : "secondary"
                      }
                      className={
                        phase.status === "completed"
                          ? "bg-green-600"
                          : phase.status === "in-progress"
                          ? "bg-blue-600"
                          : ""
                      }
                    >
                      {phase.status === "completed"
                        ? "Completed"
                        : phase.status === "in-progress"
                        ? "In Progress"
                        : "Pending"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{phase.progress}%</span>
                    </div>
                    <Progress value={phase.progress} className="h-1.5" />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {phase.actions.map((action) => (
                      <Button
                        key={action.route}
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(action.route)}
                        className="text-xs"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, Minus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Permission {
  feature: string;
  superuser: boolean | "limited";
  owner: boolean | "limited";
  admin: boolean | "limited";
  technician: boolean | "limited";
  viewer: boolean | "limited";
}

const organizationPermissions: Permission[] = [
  {
    feature: "Edit organization profile",
    superuser: true,
    owner: true,
    admin: true,
    technician: false,
    viewer: false,
  },
  {
    feature: "Manage branding",
    superuser: true,
    owner: true,
    admin: true,
    technician: false,
    viewer: false,
  },
  {
    feature: "Delete organization",
    superuser: true,
    owner: true,
    admin: false,
    technician: false,
    viewer: false,
  },
];

const teamPermissions: Permission[] = [
  {
    feature: "Invite members",
    superuser: true,
    owner: true,
    admin: true,
    technician: false,
    viewer: false,
  },
  {
    feature: "Assign roles",
    superuser: true,
    owner: true,
    admin: "limited",
    technician: false,
    viewer: false,
  },
  {
    feature: "Remove members",
    superuser: true,
    owner: true,
    admin: true,
    technician: false,
    viewer: false,
  },
];

const frameworkPermissions: Permission[] = [
  {
    feature: "Configure domains",
    superuser: true,
    owner: true,
    admin: true,
    technician: false,
    viewer: false,
  },
  {
    feature: "Edit criteria",
    superuser: true,
    owner: true,
    admin: true,
    technician: false,
    viewer: false,
  },
  {
    feature: "Import frameworks",
    superuser: true,
    owner: true,
    admin: true,
    technician: false,
    viewer: false,
  },
];

const assessmentPermissions: Permission[] = [
  {
    feature: "Create assessment",
    superuser: true,
    owner: true,
    admin: true,
    technician: true,
    viewer: false,
  },
  {
    feature: "Submit evidence",
    superuser: true,
    owner: true,
    admin: true,
    technician: true,
    viewer: false,
  },
  {
    feature: "Score responses",
    superuser: true,
    owner: true,
    admin: true,
    technician: true,
    viewer: false,
  },
  {
    feature: "View results",
    superuser: true,
    owner: true,
    admin: true,
    technician: true,
    viewer: true,
  },
];

const qaPermissions: Permission[] = [
  {
    feature: "QA sign-off",
    superuser: true,
    owner: true,
    admin: true,
    technician: false,
    viewer: false,
  },
  {
    feature: "Final approval",
    superuser: true,
    owner: true,
    admin: false,
    technician: false,
    viewer: false,
  },
  {
    feature: "Publish results",
    superuser: true,
    owner: true,
    admin: false,
    technician: false,
    viewer: false,
  },
];

const adminPermissions: Permission[] = [
  {
    feature: "System configuration",
    superuser: true,
    owner: false,
    admin: false,
    technician: false,
    viewer: false,
  },
  {
    feature: "Health checker",
    superuser: true,
    owner: true,
    admin: false,
    technician: false,
    viewer: false,
  },
  {
    feature: "Watchdog setup",
    superuser: true,
    owner: true,
    admin: true,
    technician: false,
    viewer: false,
  },
];

const PermissionIcon = ({ value }: { value: boolean | "limited" }) => {
  if (value === true) {
    return <Check className="h-5 w-5 text-green-600 mx-auto" />;
  } else if (value === "limited") {
    return <Minus className="h-5 w-5 text-yellow-600 mx-auto" />;
  }
  return <X className="h-5 w-5 text-red-300 mx-auto" />;
};

const PermissionTable = ({ permissions, title }: { permissions: Permission[]; title: string }) => {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-muted-foreground">{title}</h3>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Feature / Field</TableHead>
              <TableHead className="text-center font-semibold">Superuser</TableHead>
              <TableHead className="text-center font-semibold">Owner</TableHead>
              <TableHead className="text-center font-semibold">Admin</TableHead>
              <TableHead className="text-center font-semibold">Technician</TableHead>
              <TableHead className="text-center font-semibold">Viewer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((permission, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{permission.feature}</TableCell>
                <TableCell className="text-center">
                  <PermissionIcon value={permission.superuser} />
                </TableCell>
                <TableCell className="text-center">
                  <PermissionIcon value={permission.owner} />
                </TableCell>
                <TableCell className="text-center">
                  <PermissionIcon value={permission.admin} />
                </TableCell>
                <TableCell className="text-center">
                  <PermissionIcon value={permission.technician} />
                </TableCell>
                <TableCell className="text-center">
                  <PermissionIcon value={permission.viewer} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default function UserFieldMatrix() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">User Field Matrix</h1>
        <p className="text-muted-foreground">
          Role-based permissions and access control matrix
        </p>
      </div>

      {/* Role Definitions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Definitions</CardTitle>
          <CardDescription>
            Understanding different user roles and their organizational scope
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <Badge className="bg-purple-600">Superuser</Badge>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Backoffice Level</h4>
                <p className="text-sm text-muted-foreground">
                  Full access to all features and organizations. Global (APGI) scope with system
                  administration capabilities.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <Badge className="bg-blue-600">Owner</Badge>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Organization Level</h4>
                <p className="text-sm text-muted-foreground">
                  Full access within organization and subsidiaries. Can manage organization
                  settings, team, and all assessment activities.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <Badge className="bg-green-600">Admin</Badge>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Organization Level</h4>
                <p className="text-sm text-muted-foreground">
                  Configuration and team management within organization and subsidiaries. Cannot
                  delete organization or perform final approvals.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <Badge className="bg-orange-600">Technician</Badge>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Organization Level</h4>
                <p className="text-sm text-muted-foreground">
                  Assessment execution and evidence submission within single organization. Can
                  create assessments and submit evidence.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <Badge variant="secondary">Viewer</Badge>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Organization Level</h4>
                <p className="text-sm text-muted-foreground">
                  Read-only access to results within single organization. Cannot modify any data or
                  configurations.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organizational Access */}
      <Card>
        <CardHeader>
          <CardTitle>Organizational Access Rules</CardTitle>
          <CardDescription>
            How roles interact with the organizational hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge className="bg-purple-600">Backoffice (APGI)</Badge>
              </h4>
              <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                <li>Access: All organizations and best practices</li>
                <li>Visibility: Global view across all Mother Companies</li>
                <li>Permissions: Full system administration</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge className="bg-blue-600">Mother Company</Badge>
              </h4>
              <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                <li>Access: Own organization and future subsidiaries</li>
                <li>Visibility: Own data and aggregated subsidiary data</li>
                <li>Permissions: Organization-level administration</li>
              </ul>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg opacity-60">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="secondary">Future: Sister Company</Badge>
              </h4>
              <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                <li>Access: Own organization and future subsidiaries</li>
                <li>Visibility: Own data only (isolated from other sisters)</li>
                <li>Permissions: Organization-level administration</li>
              </ul>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg opacity-60">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="secondary">Future: Subsidiary</Badge>
              </h4>
              <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                <li>Access: Own organization only</li>
                <li>Visibility: Own data, limited parent visibility</li>
                <li>Permissions: Limited administration</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Field-Level Permissions Matrix</CardTitle>
          <CardDescription>
            Detailed permissions for each role across different features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="organization" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="organization">Organization</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="framework">Framework</TabsTrigger>
              <TabsTrigger value="assessment">Assessment</TabsTrigger>
              <TabsTrigger value="qa">QA/Approval</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>

            <TabsContent value="organization" className="mt-6">
              <PermissionTable
                permissions={organizationPermissions}
                title="Organization Settings"
              />
            </TabsContent>

            <TabsContent value="team" className="mt-6">
              <PermissionTable permissions={teamPermissions} title="Team Management" />
            </TabsContent>

            <TabsContent value="framework" className="mt-6">
              <PermissionTable permissions={frameworkPermissions} title="Assessment Framework" />
            </TabsContent>

            <TabsContent value="assessment" className="mt-6">
              <PermissionTable permissions={assessmentPermissions} title="Assessment Execution" />
            </TabsContent>

            <TabsContent value="qa" className="mt-6">
              <PermissionTable permissions={qaPermissions} title="QA & Approval" />
            </TabsContent>

            <TabsContent value="admin" className="mt-6">
              <PermissionTable permissions={adminPermissions} title="Admin Functions" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <span className="text-sm">Full Access</span>
            </div>
            <div className="flex items-center gap-2">
              <Minus className="h-5 w-5 text-yellow-600" />
              <span className="text-sm">Limited Access</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-300" />
              <span className="text-sm">No Access</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

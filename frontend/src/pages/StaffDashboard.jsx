import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, LogOut, FileText, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StaffDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    try {
      const data = await api.getMyIssues();
      setIssues(data.issues);
    } catch (error) {
      toast.error("Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      Open: "bg-blue-100 text-blue-800",
      "In Progress": "bg-yellow-100 text-yellow-800",
      Escalated: "bg-red-100 text-red-800",
      Resolved: "bg-green-100 text-green-800",
    };
    return <Badge className={styles[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
  };

  const openIssues = issues.filter((i) => i.status === "Open").length;
  const inProgress = issues.filter((i) => i.status === "In Progress").length;
  const resolved = issues.filter((i) => i.status === "Resolved").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-emerald-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">TrustLoop AI</h1>
                <p className="text-xs text-gray-500">{user?.role} Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={logout} data-testid="logout-button">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover-lift">
            <CardHeader className="pb-3">
              <CardDescription>Open Issues</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{openIssues}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="pb-3">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-3xl text-yellow-600">{inProgress}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="pb-3">
              <CardDescription>Resolved</CardDescription>
              <CardTitle className="text-3xl text-green-600">{resolved}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <CardTitle>Assigned Issues</CardTitle>
            </div>
            <CardDescription>
              Issues assigned to {user?.role} for resolution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="assigned-issues-list">
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading issues...</div>
              ) : issues.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No issues assigned yet
                </div>
              ) : (
                issues.map((issue) => (
                  <Card
                    key={issue.issue_id}
                    className="hover-lift cursor-pointer"
                    onClick={() => navigate(`/issue/${issue.issue_id}`)}
                    data-testid={`issue-card-${issue.issue_id}`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{issue.summary}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {issue.original_text}
                          </p>
                        </div>
                        {getStatusBadge(issue.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                        <Badge variant="outline">{issue.category}</Badge>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Urgency: {issue.urgency_score}/100
                        </span>
                        {issue.frequency_count > 1 && (
                          <span className="text-emerald-600 font-medium">
                            {issue.frequency_count} reports
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                        <span>Created: {new Date(issue.created_at).toLocaleDateString()}</span>
                        <span>SLA: {new Date(issue.sla_deadline).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboard;
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, LogOut, BarChart3, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [issuesData, statsData] = await Promise.all([
        api.getAllIssues(),
        api.getDashboardStats(),
      ]);
      setIssues(issuesData.issues);
      setStats(statsData);
    } catch (error) {
      toast.error("Failed to load data");
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
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card className="hover-lift">
              <CardHeader className="pb-3">
                <CardDescription>Total Issues</CardDescription>
                <CardTitle className="text-3xl text-gray-900">{stats.total_issues}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="hover-lift">
              <CardHeader className="pb-3">
                <CardDescription>Open</CardDescription>
                <CardTitle className="text-3xl text-blue-600">{stats.open_issues}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="hover-lift">
              <CardHeader className="pb-3">
                <CardDescription>In Progress</CardDescription>
                <CardTitle className="text-3xl text-yellow-600">{stats.in_progress}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="hover-lift">
              <CardHeader className="pb-3">
                <CardDescription>Escalated</CardDescription>
                <CardTitle className="text-3xl text-red-600">{stats.escalated}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="hover-lift">
              <CardHeader className="pb-3">
                <CardDescription>Resolved</CardDescription>
                <CardTitle className="text-3xl text-green-600">{stats.resolved}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <CardTitle>Category Breakdown</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {stats?.categories?.map((cat) => (
                <div key={cat._id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="font-medium">{cat._id}</span>
                  <Badge variant="outline">{cat.count} issues</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <CardTitle>High Priority Issues</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {issues
                  .filter((i) => i.urgency_score >= 70)
                  .slice(0, 5)
                  .map((issue) => (
                    <div
                      key={issue.issue_id}
                      className="p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100"
                      onClick={() => navigate(`/issue/${issue.issue_id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-gray-900">{issue.summary}</p>
                        <Badge className="bg-red-100 text-red-800">{issue.urgency_score}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{issue.category}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>All Issues</CardTitle>
            <CardDescription>Complete overview of all submitted issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="all-issues-list">
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading issues...</div>
              ) : issues.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No issues found</div>
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
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{issue.summary}</h3>
                            {issue.urgency_score >= 70 && (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {issue.original_text}
                          </p>
                        </div>
                        {getStatusBadge(issue.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                        <Badge variant="outline">{issue.category}</Badge>
                        <span>Assigned: {issue.assigned_role}</span>
                        <span>Urgency: {issue.urgency_score}/100</span>
                        {issue.frequency_count > 1 && (
                          <span className="text-emerald-600 font-medium">
                            {issue.frequency_count} similar reports
                          </span>
                        )}
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

export default AdminDashboard;
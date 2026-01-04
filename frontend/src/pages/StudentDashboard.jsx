import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { uploadFileToFirebase } from "../services/firebaseStorage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, LogOut, MessageSquare, Upload, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [feedback, setFeedback] = useState({
    category: "Academics",
    text: "",
    evidence_urls: [],
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.text.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setSubmitting(true);
    try {
      await api.submitFeedback(feedback);
      toast.success("Feedback submitted anonymously!");
      setFeedback({ category: "Academics", text: "", evidence_urls: [] });
      loadIssues();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      toast.info("Uploading to Firebase...");
      const downloadURL = await uploadFileToFirebase(file, "evidence");
      setFeedback({ ...feedback, evidence_urls: [...feedback.evidence_urls, downloadURL] });
      toast.success("Evidence uploaded to Firebase");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload evidence");
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

  const getStatusIcon = (status) => {
    switch (status) {
      case "Open":
        return <Clock className="w-4 h-4" />;
      case "In Progress":
        return <AlertCircle className="w-4 h-4" />;
      case "Resolved":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
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
                <p className="text-xs text-gray-500">Student Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="hover-lift" data-testid="submit-feedback-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <CardTitle>Submit Anonymous Feedback</CardTitle>
              </div>
              <CardDescription>
                Your identity is verified but your feedback remains anonymous
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={feedback.category}
                    onValueChange={(value) => setFeedback({ ...feedback, category: value })}
                  >
                    <SelectTrigger data-testid="feedback-category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Academics">Academics</SelectItem>
                      <SelectItem value="Hostel">Hostel</SelectItem>
                      <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                      <SelectItem value="Food">Food & Dining</SelectItem>
                      <SelectItem value="Transportation">Transportation</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="feedback-text">Your Feedback</Label>
                  <Textarea
                    id="feedback-text"
                    data-testid="feedback-text-area"
                    placeholder="Describe your concern or feedback..."
                    rows={6}
                    value={feedback.text}
                    onChange={(e) => setFeedback({ ...feedback, text: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    AI will moderate and rewrite in neutral tone for anonymity
                  </p>
                </div>

                <div>
                  <Label htmlFor="evidence-upload">Evidence (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("evidence-upload").click()}
                      data-testid="upload-evidence-button"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </Button>
                    <input
                      id="evidence-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {feedback.evidence_urls.length > 0 && (
                      <span className="text-sm text-green-600">
                        {feedback.evidence_urls.length} file(s) uploaded
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  data-testid="submit-feedback-button"
                  className="w-full gradient-bg hover:opacity-90"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Anonymously"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Submitted Issues</CardTitle>
                <CardDescription>
                  Track your anonymous feedback (only you can see this)
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="space-y-3" data-testid="issues-list">
              {loading ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    Loading issues...
                  </CardContent>
                </Card>
              ) : issues.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No issues submitted yet
                  </CardContent>
                </Card>
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
                        <div className="flex items-center gap-2">
                          {getStatusIcon(issue.status)}
                          <h3 className="font-semibold text-gray-900">{issue.summary}</h3>
                        </div>
                        {getStatusBadge(issue.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                        <Badge variant="outline">{issue.category}</Badge>
                        <span>Urgency: {issue.urgency_score}/100</span>
                        <span>Assigned: {issue.assigned_role}</span>
                      </div>
                      {issue.frequency_count > 1 && (
                        <p className="text-xs text-emerald-600 mt-2">
                          {issue.frequency_count} similar reports
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
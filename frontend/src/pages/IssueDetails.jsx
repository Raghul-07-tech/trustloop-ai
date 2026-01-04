import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { uploadAudioToFirebase } from "../services/firebaseStorage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, MessageSquare, Mic, Send, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

const IssueDetails = () => {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [issue, setIssue] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updateText, setUpdateText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    loadIssueDetails();
  }, [issueId]);

  const loadIssueDetails = async () => {
    try {
      const data = await api.getIssue(issueId);
      setIssue(data.issue);
      setUpdates(data.updates);
    } catch (error) {
      toast.error("Failed to load issue details");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUpdate = async (e) => {
    e.preventDefault();
    if (!updateText.trim()) {
      toast.error("Please enter update text");
      return;
    }

    setSubmitting(true);
    try {
      await api.addUpdate(issueId, {
        content_type: "text",
        content_text: updateText,
      });
      toast.success("Update added successfully");
      setUpdateText("");
      loadIssueDetails();
    } catch (error) {
      toast.error("Failed to add update");
    } finally {
      setSubmitting(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        try {
          toast.info("Uploading audio to Firebase...");
          const downloadURL = await uploadAudioToFirebase(audioBlob);
          
          await api.addUpdate(issueId, {
            content_type: "audio",
            content_text: downloadURL,
          });
          toast.success("Voice update added");
          loadIssueDetails();
        } catch (error) {
          console.error("Audio upload error:", error);
          toast.error("Failed to upload audio");
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      toast.success("Recording started");
    } catch (error) {
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleEscalate = async () => {
    setEscalating(true);
    try {
      await api.escalateIssue(issueId, "Manual escalation");
      toast.success("Issue escalated successfully");
      loadIssueDetails();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to escalate");
    } finally {
      setEscalating(false);
    }
  };

  const handleResolve = async () => {
    try {
      await api.updateStatus(issueId, "Resolved");
      toast.success("Issue marked as resolved");
      loadIssueDetails();
    } catch (error) {
      toast.error("Failed to update status");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Issue not found</p>
      </div>
    );
  }

  const canUpdate = user?.role !== "Student";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-2xl">{issue.summary}</CardTitle>
                  {issue.urgency_score >= 70 && <AlertTriangle className="w-6 h-6 text-red-600" />}
                </div>
                <CardDescription className="text-base mt-2">{issue.original_text}</CardDescription>
              </div>
              {getStatusBadge(issue.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <Badge variant="outline" className="mt-1">
                  {issue.category}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Assigned To</p>
                <p className="text-sm font-medium mt-1">{issue.assigned_role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Urgency Score</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-medium">{issue.urgency_score}/100</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Similar Reports</p>
                <p className="text-sm font-medium mt-1 text-emerald-600">
                  {issue.frequency_count}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm font-medium">
                  {new Date(issue.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">SLA Deadline</p>
                <p className="text-sm font-medium">
                  {new Date(issue.sla_deadline).toLocaleString()}
                </p>
              </div>
            </div>

            {canUpdate && issue.status !== "Resolved" && (
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleEscalate}
                  variant="outline"
                  disabled={escalating}
                  data-testid="escalate-button"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {escalating ? "Escalating..." : "Escalate"}
                </Button>
                <Button
                  onClick={handleResolve}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="resolve-button"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Resolved
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              Updates & Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" data-testid="updates-list">
              {updates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No updates yet</p>
              ) : (
                updates.map((update) => (
                  <div key={update.update_id} className="border-l-4 border-emerald-500 pl-4 py-2">
                    <div className="flex justify-between items-start mb-1">
                      <Badge variant="outline">{update.role}</Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(update.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {update.content_type === "text" ? (
                      <p className="text-sm text-gray-700 mt-2">{update.content_text}</p>
                    ) : (
                      <div className="flex items-center gap-2 mt-2">
                        <Mic className="w-4 h-4 text-emerald-600" />
                        <audio controls src={update.content_text} className="max-w-full" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {canUpdate && issue.status !== "Resolved" && (
              <div className="mt-6">
                <Separator className="my-6" />
                <form onSubmit={handleAddUpdate} className="space-y-4">
                  <div>
                    <Label htmlFor="update-text">Add Update</Label>
                    <Textarea
                      id="update-text"
                      data-testid="update-text-area"
                      placeholder="Provide progress update..."
                      rows={4}
                      value={updateText}
                      onChange={(e) => setUpdateText(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      data-testid="submit-update-button"
                      disabled={submitting}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {submitting ? "Posting..." : "Post Update"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={recording ? stopRecording : startRecording}
                      data-testid="voice-record-button"
                    >
                      <Mic className={`w-4 h-4 mr-2 ${recording ? 'text-red-600' : ''}`} />
                      {recording ? "Stop Recording" : "Voice Update"}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IssueDetails;
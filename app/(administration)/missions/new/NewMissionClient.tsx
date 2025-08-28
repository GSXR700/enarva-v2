"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Quote = {
  id: string;
  leadId: string;
  lead: { firstName: string; lastName: string };
};

type User = {
  id: string;
  name: string;
};

type NewMissionClientProps = {
  quotes: Quote[];
  teamLeaders: User[];
};

export default function NewMissionClient({
  quotes,
  teamLeaders,
}: NewMissionClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    quoteId: searchParams.get("quoteId") || "",
    leadId: "", // ✅ added
    leadName: "",
    address: "",
    scheduledDate: "",
    estimatedDuration: "",
    teamLeaderId: "",
    accessNotes: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectChange = (id: string, value: string) => {
    if (id === "quoteId") {
      const selectedQuote = quotes.find((q) => q.id === value);
      if (selectedQuote) {
        setFormData((prev) => ({
          ...prev,
          quoteId: value,
          leadId: selectedQuote.leadId, // ✅ store leadId for API
          leadName: `${selectedQuote.lead.firstName} ${selectedQuote.lead.lastName}`,
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to create mission");
      }

      const mission = await res.json();
      console.log("Mission created:", mission);

      // ✅ redirect after success
      router.push("/missions");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Select Quote */}
      <div>
        <Label htmlFor="quoteId">Quote</Label>
        <Select
          value={formData.quoteId}
          onValueChange={(value) => handleSelectChange("quoteId", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a quote" />
          </SelectTrigger>
          <SelectContent>
            {quotes.map((quote) => (
              <SelectItem key={quote.id} value={quote.id}>
                {quote.lead.firstName} {quote.lead.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lead Name (auto-filled, read only) */}
      <div>
        <Label htmlFor="leadName">Lead Name</Label>
        <Input
          id="leadName"
          value={formData.leadName}
          onChange={handleChange}
          disabled
        />
      </div>

      {/* Address */}
      <div>
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={handleChange}
          required
        />
      </div>

      {/* Scheduled Date */}
      <div>
        <Label htmlFor="scheduledDate">Scheduled Date</Label>
        <Input
          id="scheduledDate"
          type="date"
          value={formData.scheduledDate}
          onChange={handleChange}
          required
        />
      </div>

      {/* Estimated Duration */}
      <div>
        <Label htmlFor="estimatedDuration">Estimated Duration (hours)</Label>
        <Input
          id="estimatedDuration"
          type="number"
          value={formData.estimatedDuration}
          onChange={handleChange}
          required
        />
      </div>

      {/* Team Leader */}
      <div>
        <Label htmlFor="teamLeaderId">Team Leader</Label>
        <Select
          value={formData.teamLeaderId}
          onValueChange={(value) => handleSelectChange("teamLeaderId", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a team leader" />
          </SelectTrigger>
          <SelectContent>
            {teamLeaders.map((leader) => (
              <SelectItem key={leader.id} value={leader.id}>
                {leader.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Access Notes */}
      <div>
        <Label htmlFor="accessNotes">Access Notes</Label>
        <textarea
          id="accessNotes"
          value={formData.accessNotes}
          onChange={handleChange}
          className="w-full border rounded-md p-2"
        />
      </div>

      {error && <p className="text-red-500">{error}</p>}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Creating..." : "Create Mission"}
      </Button>
    </form>
  );
}

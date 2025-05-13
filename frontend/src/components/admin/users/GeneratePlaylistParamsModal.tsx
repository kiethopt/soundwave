"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface GeneratePlaylistParamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: {
    customPromptKeywords: string;
    requestedTrackCount: number;
  }) => void;
  isLoading?: boolean;
}

const audioFeaturesOptions = [
  { id: "tempo", label: "Tempo" },
  { id: "mood", label: "Mood" },
  { id: "key", label: "Key (and Scale)" },
  { id: "danceability", label: "Danceability" },
  { id: "energy", label: "Energy" },
  { id: "genres", label: "Genres" },
  { id: "artist", label: "Artist" },
];

const GeneratePlaylistParamsModal: React.FC<
  GeneratePlaylistParamsModalProps
> = ({ isOpen, onClose, onGenerate, isLoading = false }) => {
  const [selectedFeatures, setSelectedFeatures] = useState<
    Record<string, boolean>
  >({});
  const [requestedTrackCount, setRequestedTrackCount] = useState<number>(15);

  useEffect(() => {
    if (isOpen) {
      setSelectedFeatures({});
      setRequestedTrackCount(15);
    }
  }, [isOpen]);

  const handleFeatureChange = (featureId: string) => {
    setSelectedFeatures((prev) => ({
      ...prev,
      [featureId]: !prev[featureId],
    }));
  };

  const handleTrackCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value, 10);
    if (e.target.value === "") {
      // @ts-expect-error allow empty string for controlled input
      setRequestedTrackCount("");
    } else if (!isNaN(count)) {
      setRequestedTrackCount(count);
    }
  };

  const atLeastOneFeatureSelected = useMemo(() => {
    return Object.values(selectedFeatures).some((isSelected) => isSelected);
  }, [selectedFeatures]);

  const isTrackCountValid = useMemo(() => {
    const numTrackCount = Number(requestedTrackCount);
    return numTrackCount >= 10 && numTrackCount <= 30;
  }, [requestedTrackCount]);

  const canGenerate = useMemo(() => {
    return atLeastOneFeatureSelected && isTrackCountValid && !isLoading;
  }, [atLeastOneFeatureSelected, isTrackCountValid, isLoading]);

  const handleSubmit = () => {
    if (!canGenerate) return;

    const activeSelectedFeatures = audioFeaturesOptions.filter(
      (feature) => selectedFeatures[feature.id]
    );

    let customPromptKeywords = "";

    if (activeSelectedFeatures.length > 0) {
      const featureFocusStrings = activeSelectedFeatures.map((feature) => {
        let featureName = feature.label.toLowerCase();
        if (feature.id === "key") {
          featureName = "musical key and scale";
        } else if (feature.id === "genres") {
          featureName = "primary genres";
        } else if (feature.id === "artist") {
          featureName =
            "artist profiles (e.g., primary artists, similar artists)";
        }
        return featureName;
      });

      if (activeSelectedFeatures.length === 1) {
        const singleFeatureId = activeSelectedFeatures[0].id;
        customPromptKeywords = `Strictly prioritize tracks whose ${featureFocusStrings[0]} closely match the user\'s listening history for this aspect. Other aspects are secondary for this generation.`;
        if (singleFeatureId === "genres") {
          customPromptKeywords +=
            " Extract the most prominent genres from the user's history and focus on those.";
        } else if (singleFeatureId === "artist") {
          customPromptKeywords +=
            " Analyze the most listened to artists and similar artists (based on shared genres, style, and collaborations) from the user's history and focus on those when selecting tracks.";
        }
      } else {
        // Create a mutable copy for pop
        const mutableFeatureFocusStrings = [...featureFocusStrings];
        const lastFeatureString = mutableFeatureFocusStrings.pop() as string; // Assert as string, length > 1
        const initialFeaturesString = mutableFeatureFocusStrings.join(", ");

        if (mutableFeatureFocusStrings.length > 0) {
          customPromptKeywords = `Generate tracks by finding a good balance across these core criteria: ${initialFeaturesString} and ${lastFeatureString}. These aspects, derived from the user\'s listening history, are all important.`;
        } else {
          // This case should ideally not be hit if activeSelectedFeatures.length > 1,
          // but as a fallback, treat as a single feature (the last one popped).
          customPromptKeywords = `Strictly prioritize tracks whose ${lastFeatureString} closely match the user\'s listening history for this aspect. Other aspects are secondary for this generation.`;
        }

        if (activeSelectedFeatures.some((f) => f.id === "genres")) {
          customPromptKeywords +=
            " When considering genres, extract the most prominent ones from the user's history and focus on those.";
        }
        if (activeSelectedFeatures.some((f) => f.id === "artist")) {
          customPromptKeywords +=
            " When considering artists, analyze the most listened to artists and similar artists (based on shared genres, style, and collaborations) from the user's history and focus on those. Ensure recommended artists are relevant to the user\\'s taste profile shown in their history.";
        }
      }
      customPromptKeywords +=
        " The goal is a cohesive playlist strongly reflecting the user\\'s preferences for the selected criteria, while still offering some variety and discovery if possible.";
    } else {
      customPromptKeywords =
        "Generate a diverse playlist based on the user's overall listening history, considering various musical aspects for a fresh and enjoyable experience.";
    }

    const numTrackCount = Number(requestedTrackCount);
    onGenerate({ customPromptKeywords, requestedTrackCount: numTrackCount });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Customize Playlist Generation
          </DialogTitle>
          <DialogDescription>
            Select audio features and set the number of tracks for the AI to
            generate.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div>
            <Label className="text-base font-medium mb-3 block">
              Audio Features (select at least one)
            </Label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {audioFeaturesOptions.map((feature) => (
                <div key={feature.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`feature-${feature.id}`}
                    checked={!!selectedFeatures[feature.id]}
                    onCheckedChange={() => handleFeatureChange(feature.id)}
                  />
                  <Label
                    htmlFor={`feature-${feature.id}`}
                    className="font-normal cursor-pointer"
                  >
                    {feature.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label
              htmlFor="trackCount"
              className="text-base font-medium col-span-2"
            >
              Number of Tracks
            </Label>
            <Input
              id="trackCount"
              type="number"
              value={requestedTrackCount}
              onChange={handleTrackCountChange}
              min="10"
              max="30"
              className="col-span-2"
              placeholder="10-30"
            />
            {!isTrackCountValid &&
              Number.isInteger(Number(requestedTrackCount)) &&
              String(requestedTrackCount) !== "" && (
                <p className="col-span-4 text-sm text-red-500 mt-1">
                  Track count must be between 10 and 30.
                </p>
              )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canGenerate || isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Playlist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GeneratePlaylistParamsModal;

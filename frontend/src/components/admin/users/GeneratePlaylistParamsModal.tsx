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
import { Loader2, AlertTriangle } from "lucide-react";

interface GeneratePlaylistParamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: {
    focusOnFeatures: string[];
    requestedTrackCount: number;
    playlistName?: string;
    playlistDescription?: string;
  }) => void;
  isLoading?: boolean;
  featureAvailability?: Record<string, boolean>;
  isGenerateAll?: boolean;
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
> = ({
  isOpen,
  onClose,
  onGenerate,
  isLoading = false,
  featureAvailability = {},
  isGenerateAll = false,
}) => {
  const [selectedFeatures, setSelectedFeatures] = useState<
    Record<string, boolean>
  >({});
  const [requestedTrackCount, setRequestedTrackCount] = useState<number>(15);
  const [playlistName, setPlaylistName] = useState<string>("");
  const [playlistDescription, setPlaylistDescription] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setSelectedFeatures({});
      setRequestedTrackCount(15);
      setPlaylistName("");
      setPlaylistDescription("");
    }
  }, [isOpen]);

  const availableFeatureKeysFromStats = useMemo(() => {
    return audioFeaturesOptions
      .filter((opt) => featureAvailability[opt.id])
      .map((opt) => opt.id);
  }, [featureAvailability]);

  const anyFeatureMeetsCriteria = useMemo(() => {
    return availableFeatureKeysFromStats.length > 0;
  }, [availableFeatureKeysFromStats]);

  const handleFeatureChange = (featureId: string) => {
    if (featureAvailability[featureId]) {
      setSelectedFeatures((prev) => ({
        ...prev,
        [featureId]: !prev[featureId],
      }));
    }
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
    return Object.entries(selectedFeatures).some(
      ([featureId, isSelected]) => isSelected && featureAvailability[featureId]
    );
  }, [selectedFeatures, featureAvailability]);

  const isTrackCountValid = useMemo(() => {
    const numTrackCount = Number(requestedTrackCount);
    return numTrackCount >= 10 && numTrackCount <= 30;
  }, [requestedTrackCount]);

  const isPlaylistNameValid = useMemo(() => {
    return playlistName.trim().length > 0 && playlistName.trim().length <= 50;
  }, [playlistName]);

  const isPlaylistDescriptionValid = useMemo(() => {
    return playlistDescription.trim().length <= 150;
  }, [playlistDescription]);

  const canGenerate = useMemo(() => {
    if (isGenerateAll) {
      return (
        isPlaylistNameValid &&
        isPlaylistDescriptionValid &&
        !isLoading
      );
    }
    return (
      anyFeatureMeetsCriteria &&
      atLeastOneFeatureSelected &&
      isTrackCountValid &&
      isPlaylistNameValid &&
      isPlaylistDescriptionValid &&
      !isLoading
    );
  }, [
    anyFeatureMeetsCriteria,
    atLeastOneFeatureSelected,
    isTrackCountValid,
    isPlaylistNameValid,
    isPlaylistDescriptionValid,
    isLoading,
    isGenerateAll,
  ]);

  const handleSubmit = () => {
    if (!canGenerate) return;
    if (isGenerateAll) {
      onGenerate({
        focusOnFeatures: [],
        requestedTrackCount: 20,
        playlistName: playlistName.trim(),
        playlistDescription: playlistDescription.trim(),
      });
      return;
    }

    const activeFeatures = audioFeaturesOptions
      .filter(
        (feature) =>
          selectedFeatures[feature.id] && featureAvailability[feature.id]
      )
      .map((feature) => feature.id);

    const numTrackCount = Number(requestedTrackCount);

    onGenerate({
      focusOnFeatures: activeFeatures,
      requestedTrackCount: numTrackCount,
      playlistName: playlistName.trim(),
      playlistDescription: playlistDescription.trim(),
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isGenerateAll 
              ? "Generate Playlists For All Users" 
              : "Customize Playlist Generation"}
          </DialogTitle>
          <DialogDescription>
            {isGenerateAll
              ? "Create a personalized playlist for all users - provide a name and optional description." 
              : "Select audio features, set track count, and optionally name and describe your playlist."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto pr-5 pl-1 py-4">
          {!isGenerateAll && !anyFeatureMeetsCriteria && isOpen && (
            <div className="my-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <p className="font-semibold">
                  Insufficient Data for Generation
                </p>
              </div>
              <p className="text-sm mt-1">
                Cannot generate playlist. No single audio feature (e.g., Mood,
                Genre, Tempo) currently has enough distinct data points (at
                least 2 required per feature type) from the user's listening
                history. Please ensure more diverse listening data or try
                re-analyzing tracks.
              </p>
            </div>
          )}

          <div className="grid gap-6">
            <div>
              <Label
                className="text-base font-medium mb-1 block"
                htmlFor="playlistName"
              >
                Playlist Name (required)
              </Label>
              <Input
                id="playlistName"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="E.g., My Awesome Mix"
                maxLength={50}
                className="mb-1"
              />
              <p className="text-xs text-muted-foreground text-right pr-1">
                {playlistName.length}/{50}
              </p>
              {playlistName.length > 0 && playlistName.trim().length === 0 && (
                <p className="text-sm text-yellow-600">
                  Playlist name cannot be empty.
                </p>
              )}
              {playlistName.trim().length > 50 && (
                <p className="text-sm text-red-500">
                  Name cannot exceed 50 characters.
                </p>
              )}
              {isOpen && playlistName.trim().length === 0 && (
                <p className="text-sm text-yellow-600">
                  Playlist name is required.
                </p>
              )}
            </div>

            <div>
              <Label
                className="text-base font-medium mb-1 block"
                htmlFor="playlistDescription"
              >
                Playlist Description (optional)
              </Label>
              <Input
                id="playlistDescription"
                value={playlistDescription}
                onChange={(e) => setPlaylistDescription(e.target.value)}
                placeholder="E.g., A mix for late night drives"
                maxLength={150}
                className="mb-1"
              />
              <p className="text-xs text-muted-foreground text-right pr-1">
                {playlistDescription.length}/{150}
              </p>
              {playlistDescription.trim().length > 150 && (
                <p className="text-sm text-red-500">
                  Description cannot exceed 150 characters.
                </p>
              )}
            </div>

            {!isGenerateAll && (
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Audio Features (select at least one available)
                </Label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {audioFeaturesOptions.map((feature) => {
                    const isFeatureAvailableFromStats =
                      featureAvailability[feature.id] ?? false;
                    return (
                      <div
                        key={feature.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`feature-${feature.id}`}
                          checked={
                            isFeatureAvailableFromStats &&
                            !!selectedFeatures[feature.id]
                          }
                          onCheckedChange={() => handleFeatureChange(feature.id)}
                          disabled={
                            !isFeatureAvailableFromStats ||
                            !anyFeatureMeetsCriteria
                          }
                        />
                        <Label
                          htmlFor={`feature-${feature.id}`}
                          className={`font-normal cursor-pointer ${
                            !isFeatureAvailableFromStats ||
                            !anyFeatureMeetsCriteria
                              ? "text-muted-foreground italic"
                              : ""
                          }`}
                        >
                          {feature.label}
                          {!isFeatureAvailableFromStats && (
                            <span className="text-xs ml-1">(No data)</span>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
                {!atLeastOneFeatureSelected &&
                  anyFeatureMeetsCriteria &&
                  isOpen && (
                    <p className="text-sm text-yellow-600 mt-2">
                      Please select at least one available audio feature.
                    </p>
                  )}
              </div>
            )}

            {!isGenerateAll && (
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
                  disabled={!anyFeatureMeetsCriteria}
                />
                {!isTrackCountValid &&
                  Number.isInteger(Number(requestedTrackCount)) &&
                  String(requestedTrackCount) !== "" && (
                    <p className="col-span-4 text-sm text-red-500 mt-1">
                      Track count must be between 10 and 30.
                    </p>
                  )}
              </div>
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

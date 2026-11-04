export type AffirmationStatus = "draft" | "scheduled" | "archived";

export type AffirmationView = {
  id: string;
  body: string;
  scriptureRef: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  publishDate: string;
  status: AffirmationStatus;
  amenCount: number;
  viewerAmen: boolean;
  viewerSaved: boolean;
};

export type AffirmationItem = {
  id: string;
  body: string;
  scriptureRef: string | null;
  publishDate: string;
  amenCount: number;
  viewerSaved: boolean;
};

export type AffirmationEngagement = {
  amenCount: number;
  viewerAmen: boolean;
  viewerSaved: boolean;
};

export type AdminAffirmation = {
  id: string;
  body: string;
  scriptureRef: string | null;
  imagePath: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  status: AffirmationStatus;
  publishDate: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type AffirmationMonth = {
  key: string;
  label: string;
  items: AffirmationItem[];
};

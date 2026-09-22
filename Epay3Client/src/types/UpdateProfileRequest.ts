/** Payload for the self-service profile update (name / company / regional format). */
export interface UpdateProfileRequest {
  /** Optional; the server falls back to the caller's own id when omitted. */
  userId?: string;
  firstName: string;
  lastName: string;
  company: string;
  regionalFormat?: string;
}

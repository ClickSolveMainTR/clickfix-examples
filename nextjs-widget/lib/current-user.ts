// Stand-in for your session/auth layer. In a real app read the cookie or
// session here; everything below is what a signed-in user looks like.
export interface AppUser {
  id: string;
  name: string;
  email: string;
  /** The company's id in your system, sent to the widget as company.id. */
  companyId?: string;
  companyName?: string;
}

export async function currentUser(): Promise<AppUser | null> {
  return { id: '1001', name: 'Ayşe Yılmaz', email: 'ayse@example.com', companyId: 'F-77', companyName: 'Acme A.Ş.' };
}

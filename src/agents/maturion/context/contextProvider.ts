/**
 * Maturion Context Provider
 * Provides contextual awareness of the current organization, user, page, and documents
 */

export interface MaturionContext {
  // Organization context
  organizationId: string | null;
  organizationName: string | null;
  industryTags: string[];
  complianceCommitments: string[];

  // User context
  userId: string | null;
  userRole: 'admin' | 'member' | 'viewer' | null;
  userName: string | null;
  userEmail: string | null;

  // Page context
  currentPage: string | null;
  currentDomain: string | null; // Current Six Domain being viewed
  auditItemId: string | null; // Current audit item if viewing one

  // Document context
  uploadedDocuments: {
    id: string;
    fileName: string;
    fileType: string;
    linkedToPage?: string;
    linkedToDomain?: string;
  }[];

  // Interaction history (short-term memory)
  recentInteractions: {
    timestamp: Date;
    query: string;
    response: string;
    taskCategory: string;
  }[];
}

/**
 * Builds Maturion context from current application state
 */
export function buildMaturionContext(params: {
  organization?: {
    id: string;
    name: string;
    industry_tags?: string[];
    compliance_commitments?: string[];
  } | null;
  user?: {
    id: string;
    full_name?: string;
    email?: string;
    role?: 'admin' | 'member' | 'viewer';
  } | null;
  page?: {
    path: string;
    domain?: string;
    auditItemId?: string;
  };
  documents?: Array<{
    id: string;
    file_name: string;
    file_type: string;
    linked_to_page?: string;
    linked_to_domain?: string;
  }>;
  recentInteractions?: Array<{
    timestamp: Date;
    query: string;
    response: string;
    taskCategory: string;
  }>;
}): MaturionContext {
  return {
    // Organization
    organizationId: params.organization?.id || null,
    organizationName: params.organization?.name || null,
    industryTags: params.organization?.industry_tags || [],
    complianceCommitments: params.organization?.compliance_commitments || [],

    // User
    userId: params.user?.id || null,
    userRole: params.user?.role || null,
    userName: params.user?.full_name || null,
    userEmail: params.user?.email || null,

    // Page
    currentPage: params.page?.path || null,
    currentDomain: params.page?.domain || null,
    auditItemId: params.page?.auditItemId || null,

    // Documents
    uploadedDocuments: (params.documents || []).map((doc) => ({
      id: doc.id,
      fileName: doc.file_name,
      fileType: doc.file_type,
      linkedToPage: doc.linked_to_page,
      linkedToDomain: doc.linked_to_domain,
    })),

    // Recent interactions (limit to last 10)
    recentInteractions: (params.recentInteractions || []).slice(-10),
  };
}

/**
 * Formats context as a string for inclusion in AI prompts
 */
export function formatContextForPrompt(context: MaturionContext): string {
  const sections: string[] = [];

  // Organization section
  if (context.organizationId) {
    sections.push(
      `Organization: ${context.organizationName} (ID: ${context.organizationId})`,
      `Industry: ${context.industryTags.join(', ') || 'Not specified'}`,
      `Compliance: ${context.complianceCommitments.join(', ') || 'Not specified'}`
    );
  }

  // User section
  if (context.userId) {
    sections.push(
      `User: ${context.userName} (${context.userEmail})`,
      `Role: ${context.userRole}`
    );
  }

  // Page section
  if (context.currentPage) {
    sections.push(`Current Page: ${context.currentPage}`);
    if (context.currentDomain) {
      sections.push(`Viewing Domain: ${context.currentDomain}`);
    }
    if (context.auditItemId) {
      sections.push(`Audit Item: ${context.auditItemId}`);
    }
  }

  // Documents section
  if (context.uploadedDocuments.length > 0) {
    sections.push(
      `Available Documents (${context.uploadedDocuments.length}):`
    );
    context.uploadedDocuments.slice(0, 5).forEach((doc) => {
      sections.push(`  - ${doc.fileName} (${doc.fileType})`);
    });
    if (context.uploadedDocuments.length > 5) {
      sections.push(
        `  ... and ${context.uploadedDocuments.length - 5} more documents`
      );
    }
  }

  // Recent interactions
  if (context.recentInteractions.length > 0) {
    sections.push(`Recent Interactions (last ${Math.min(3, context.recentInteractions.length)}):`);
    context.recentInteractions.slice(-3).forEach((interaction, index) => {
      sections.push(
        `  ${index + 1}. Q: ${interaction.query.substring(0, 50)}...`
      );
    });
  }

  return sections.join('\n');
}

/**
 * Extracts relevant documents based on current page/domain
 */
export function getRelevantDocuments(
  context: MaturionContext
): MaturionContext['uploadedDocuments'] {
  if (!context.currentPage && !context.currentDomain) {
    return context.uploadedDocuments;
  }

  return context.uploadedDocuments.filter((doc) => {
    // Match documents linked to current page
    if (context.currentPage && doc.linkedToPage === context.currentPage) {
      return true;
    }
    // Match documents linked to current domain
    if (context.currentDomain && doc.linkedToDomain === context.currentDomain) {
      return true;
    }
    // Include unlinked documents
    if (!doc.linkedToPage && !doc.linkedToDomain) {
      return true;
    }
    return false;
  });
}

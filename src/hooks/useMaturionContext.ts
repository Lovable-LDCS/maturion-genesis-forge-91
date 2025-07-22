import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

interface MaturionContext {
  context: string;
  currentDomain: string;
}

export const useMaturionContext = (): MaturionContext => {
  const location = useLocation();
  
  return useMemo(() => {
    const path = location.pathname;
    
    // Extract domain ID for domain-specific guidance
    const domainMatch = path.match(/\/audit\/domain\/(.+)/);
    
    // Assessment Framework page
    if (path === '/assessment/framework' || path === '/assessment-framework' || path === '/domain-management') {
      return {
        context: "Assessment framework configuration - domain setup, MPS management, and audit structure guidance. Help with creating comprehensive audit frameworks, configuring maturity practice statements, and setting up assessment criteria.",
        currentDomain: "Assessment Framework"
      };
    }
    
    // Domain Audit Builder
    if (domainMatch) {
      const domainId = domainMatch[1];
      return {
        context: `Domain-specific audit configuration for domain ${domainId}. Assistance with MPS creation, intent statement development, criteria configuration, and audit structure setup for this specific domain.`,
        currentDomain: `Domain ${domainId} Configuration`
      };
    }
    
    // Maturity Setup
    if (path === '/maturity/setup') {
      return {
        context: "Maturity model setup and foundation building. Help with organization profile configuration, risk assessment completion, model customization, and initial setup guidance for your operational maturity journey.",
        currentDomain: "Foundation Setup"
      };
    }
    
    // Maturity Build
    if (path === '/maturity/build') {
      return {
        context: "Comprehensive maturity model building and SCS development. Assistance with audit configuration, model approval processes, advanced framework setup, and preparing for organizational deployment.",
        currentDomain: "Model Building"
      };
    }
    
    // Assessment page
    if (path === '/assessment') {
      return {
        context: "Maturity assessment guidance and scoring explanation",
        currentDomain: "Assessment"
      };
    }
    
    // Journey page
    if (path === '/journey') {
      return {
        context: "Maturity journey exploration and domain-specific guidance",
        currentDomain: "Journey Planning"
      };
    }
    
    // AI Knowledge Base
    if (path === '/ai/knowledge-base') {
      return {
        context: "AI Knowledge Base management - document processing, chunking, and knowledge enhancement guidance",
        currentDomain: "AI Knowledge Base"
      };
    }
    
    // QA Sign-off
    if (path === '/qa-signoff') {
      return {
        context: "Quality assurance and sign-off process guidance",
        currentDomain: "QA Sign-off"
      };
    }
    
    // Dashboard
    if (path === '/dashboard') {
      return {
        context: "Dashboard insights, progress tracking, and organizational maturity overview",
        currentDomain: "Dashboard"
      };
    }
    
    // Modules Overview
    if (path === '/modules') {
      return {
        context: "Module overview and subscription management guidance",
        currentDomain: "Modules"
      };
    }
    
    // Team Management
    if (path === '/team') {
      return {
        context: "Team management, roles, and collaboration guidance",
        currentDomain: "Team Management"
      };
    }
    
    // Organization Settings
    if (path === '/organization/settings') {
      return {
        context: "Organization configuration and settings management",
        currentDomain: "Organization Settings"
      };
    }
    
    // Milestone Detail
    if (path.startsWith('/milestones/')) {
      return {
        context: "Milestone tracking, task management, and progress monitoring",
        currentDomain: "Milestone Management"
      };
    }
    
    // Admin Config
    if (path === '/admin/config') {
      return {
        context: "Administrative configuration and system management",
        currentDomain: "Admin Configuration"
      };
    }
    
    // Subscription pages
    if (path === '/subscribe' || path === '/subscribe/checkout') {
      return {
        context: "Subscription management and billing guidance",
        currentDomain: "Subscription"
      };
    }
    
    // Landing page and general
    if (path === '/') {
      return {
        context: "Getting started with Maturion - overview of operational maturity platform and next steps",
        currentDomain: "Home"
      };
    }
    
    // Default fallback
    return {
      context: "General operational maturity guidance and platform navigation assistance",
      currentDomain: "General"
    };
  }, [location.pathname]);
};
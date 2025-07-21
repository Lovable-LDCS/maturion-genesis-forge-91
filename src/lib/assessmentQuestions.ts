/**
 * Psychometric Assessment Questions for Maturion Free Assessment
 * 
 * These questions are designed to assess organizational maturity across 5 domains
 * using psychometric principles with friendly, business-focused language.
 */

export interface AssessmentQuestion {
  id: string;
  domain: string;
  question: string;
  options: {
    level: 'basic' | 'reactive' | 'compliant' | 'proactive' | 'resilient';
    text: string;
    description: string;
  }[];
}

export const PSYCHOMETRIC_QUESTIONS: AssessmentQuestion[] = [
  // Leadership & Governance (5 questions)
  {
    id: 'lg-1',
    domain: 'Leadership & Governance',
    question: 'How does your organization typically approach major security and compliance decisions?',
    options: [
      {
        level: 'basic',
        text: 'We handle issues as they come up',
        description: 'Reactive approach with minimal formal processes'
      },
      {
        level: 'reactive',
        text: 'We have some informal processes but mostly respond to incidents',
        description: 'Basic incident response with limited proactive planning'
      },
      {
        level: 'compliant',
        text: 'We follow established policies and meet regulatory requirements',
        description: 'Formal compliance processes with documented procedures'
      },
      {
        level: 'proactive',
        text: 'We anticipate risks and have strategic planning sessions',
        description: 'Forward-thinking with regular strategy reviews'
      },
      {
        level: 'resilient',
        text: 'We continuously evolve our governance based on emerging threats and opportunities',
        description: 'Adaptive governance with continuous improvement culture'
      }
    ]
  },
  {
    id: 'lg-2',
    domain: 'Leadership & Governance',
    question: 'When it comes to accountability for security and compliance in your organization:',
    options: [
      {
        level: 'basic',
        text: 'It\'s unclear who is responsible for what',
        description: 'No clear ownership or accountability structure'
      },
      {
        level: 'reactive',
        text: 'Someone usually steps up when there\'s a problem',
        description: 'Ad-hoc responsibility assignment during incidents'
      },
      {
        level: 'compliant',
        text: 'We have clear roles and responsibilities documented',
        description: 'Formal RACI matrix with defined accountability'
      },
      {
        level: 'proactive',
        text: 'Leaders actively champion and model security behaviors',
        description: 'Leadership engagement with visible commitment'
      },
      {
        level: 'resilient',
        text: 'Security accountability is embedded in everyone\'s performance metrics',
        description: 'Integrated accountability across all levels'
      }
    ]
  },
  {
    id: 'lg-3',
    domain: 'Leadership & Governance',
    question: 'How does your organization communicate its security and compliance vision?',
    options: [
      {
        level: 'basic',
        text: 'We don\'t really have a clear vision communicated',
        description: 'No formal communication strategy'
      },
      {
        level: 'reactive',
        text: 'We send out emails when something important happens',
        description: 'Incident-driven communication only'
      },
      {
        level: 'compliant',
        text: 'We have regular updates and training sessions',
        description: 'Scheduled communication and awareness programs'
      },
      {
        level: 'proactive',
        text: 'Leadership regularly reinforces our security culture and values',
        description: 'Consistent leadership messaging and culture building'
      },
      {
        level: 'resilient',
        text: 'Our vision is lived daily and continuously evolves with our stakeholders',
        description: 'Embedded culture with stakeholder co-creation'
      }
    ]
  },
  {
    id: 'lg-4',
    domain: 'Leadership & Governance',
    question: 'How does your organization handle strategic planning for operational excellence?',
    options: [
      {
        level: 'basic',
        text: 'We focus on immediate operational needs',
        description: 'Short-term focus without strategic planning'
      },
      {
        level: 'reactive',
        text: 'We plan for the next year based on current challenges',
        description: 'Annual planning driven by current issues'
      },
      {
        level: 'compliant',
        text: 'We have multi-year strategic plans aligned with regulations',
        description: 'Formal strategic planning with compliance alignment'
      },
      {
        level: 'proactive',
        text: 'We anticipate future challenges and opportunities in our planning',
        description: 'Forward-looking strategic planning with risk consideration'
      },
      {
        level: 'resilient',
        text: 'Our strategic planning is dynamic and adapts to emerging trends',
        description: 'Adaptive strategic planning with continuous evolution'
      }
    ]
  },
  {
    id: 'lg-5',
    domain: 'Leadership & Governance',
    question: 'How does your board or senior leadership oversee operational risk management?',
    options: [
      {
        level: 'basic',
        text: 'Senior leadership is informed about major incidents after they happen',
        description: 'Post-incident reporting only'
      },
      {
        level: 'reactive',
        text: 'Leadership receives regular reports on operational issues',
        description: 'Regular operational reporting to leadership'
      },
      {
        level: 'compliant',
        text: 'We have formal governance structures with defined reporting',
        description: 'Structured governance with formal reporting processes'
      },
      {
        level: 'proactive',
        text: 'Leadership actively participates in risk assessment and strategy',
        description: 'Active leadership involvement in risk management'
      },
      {
        level: 'resilient',
        text: 'Governance is integrated across all business decisions and strategy',
        description: 'Integrated governance in all strategic decisions'
      }
    ]
  },

  // Process Integrity (5 questions)
  {
    id: 'pi-1',
    domain: 'Process Integrity',
    question: 'How standardized are your organization\'s operational processes?',
    options: [
      {
        level: 'basic',
        text: 'People generally know what to do and figure it out as they go',
        description: 'Informal processes with tribal knowledge'
      },
      {
        level: 'reactive',
        text: 'We have some written procedures for critical processes',
        description: 'Basic documentation for key processes'
      },
      {
        level: 'compliant',
        text: 'Our processes are well-documented and regularly reviewed',
        description: 'Formal process documentation with periodic reviews'
      },
      {
        level: 'proactive',
        text: 'We continuously improve our processes based on data and feedback',
        description: 'Data-driven process improvement culture'
      },
      {
        level: 'resilient',
        text: 'Our processes are adaptive and self-improving based on real-time insights',
        description: 'Self-adaptive processes with real-time optimization'
      }
    ]
  },
  {
    id: 'pi-2',
    domain: 'Process Integrity',
    question: 'How does your organization ensure process compliance and quality?',
    options: [
      {
        level: 'basic',
        text: 'We rely on people to do the right thing',
        description: 'Trust-based approach without formal controls'
      },
      {
        level: 'reactive',
        text: 'We check processes when problems are reported',
        description: 'Problem-driven quality checks'
      },
      {
        level: 'compliant',
        text: 'We have regular audits and compliance checks',
        description: 'Scheduled compliance monitoring and auditing'
      },
      {
        level: 'proactive',
        text: 'We use automated monitoring and preventive controls',
        description: 'Automated controls with proactive monitoring'
      },
      {
        level: 'resilient',
        text: 'Quality is built into our processes with real-time adaptation',
        description: 'Embedded quality with continuous adaptation'
      }
    ]
  },
  {
    id: 'pi-3',
    domain: 'Process Integrity',
    question: 'How does your organization handle process exceptions and variations?',
    options: [
      {
        level: 'basic',
        text: 'We handle exceptions case by case as they arise',
        description: 'Ad-hoc exception handling'
      },
      {
        level: 'reactive',
        text: 'We have informal ways to handle common exceptions',
        description: 'Informal exception management'
      },
      {
        level: 'compliant',
        text: 'We have documented exception procedures and approval processes',
        description: 'Formal exception handling procedures'
      },
      {
        level: 'proactive',
        text: 'We analyze exceptions to prevent future occurrences',
        description: 'Exception analysis for process improvement'
      },
      {
        level: 'resilient',
        text: 'Our processes automatically adapt to handle variations',
        description: 'Self-adaptive processes for exception handling'
      }
    ]
  },
  {
    id: 'pi-4',
    domain: 'Process Integrity',
    question: 'How does your organization measure and improve process effectiveness?',
    options: [
      {
        level: 'basic',
        text: 'We know if processes are working by whether customers complain',
        description: 'Customer complaint-driven measurement'
      },
      {
        level: 'reactive',
        text: 'We track basic metrics like completion times and error rates',
        description: 'Basic operational metrics tracking'
      },
      {
        level: 'compliant',
        text: 'We have comprehensive KPIs and regular performance reviews',
        description: 'Formal KPI framework with regular reviews'
      },
      {
        level: 'proactive',
        text: 'We use advanced analytics to predict and prevent process issues',
        description: 'Predictive analytics for process optimization'
      },
      {
        level: 'resilient',
        text: 'Our processes continuously self-optimize based on real-time data',
        description: 'Self-optimizing processes with AI-driven insights'
      }
    ]
  },
  {
    id: 'pi-5',
    domain: 'Process Integrity',
    question: 'How does your organization integrate new technologies into existing processes?',
    options: [
      {
        level: 'basic',
        text: 'We use technology when we absolutely have to',
        description: 'Minimal technology adoption'
      },
      {
        level: 'reactive',
        text: 'We adopt technology to solve specific problems as they arise',
        description: 'Problem-driven technology adoption'
      },
      {
        level: 'compliant',
        text: 'We have planned technology rollouts aligned with business needs',
        description: 'Strategic technology planning and implementation'
      },
      {
        level: 'proactive',
        text: 'We actively seek technologies that can enhance our processes',
        description: 'Proactive technology scouting and adoption'
      },
      {
        level: 'resilient',
        text: 'Technology integration is seamless and drives continuous innovation',
        description: 'Seamless technology integration with innovation focus'
      }
    ]
  },

  // People & Culture (5 questions)
  {
    id: 'pc-1',
    domain: 'People & Culture',
    question: 'How does your organization approach security and compliance training?',
    options: [
      {
        level: 'basic',
        text: 'People learn on the job through experience',
        description: 'Informal on-the-job learning'
      },
      {
        level: 'reactive',
        text: 'We provide training when incidents happen or are required by law',
        description: 'Incident-driven and mandatory compliance training'
      },
      {
        level: 'compliant',
        text: 'We have regular training programs and track completion',
        description: 'Formal training programs with completion tracking'
      },
      {
        level: 'proactive',
        text: 'Training is role-specific and updated based on emerging threats',
        description: 'Targeted training with threat-based updates'
      },
      {
        level: 'resilient',
        text: 'Learning is continuous, adaptive, and embedded in daily work',
        description: 'Continuous learning culture with embedded development'
      }
    ]
  },
  {
    id: 'pc-2',
    domain: 'People & Culture',
    question: 'How does your organization recognize and reward security-conscious behavior?',
    options: [
      {
        level: 'basic',
        text: 'Security isn\'t really recognized unless there\'s a major incident',
        description: 'No formal recognition for security behavior'
      },
      {
        level: 'reactive',
        text: 'We occasionally acknowledge good security practices',
        description: 'Informal recognition of security practices'
      },
      {
        level: 'compliant',
        text: 'Security performance is part of our regular evaluation process',
        description: 'Security included in formal performance evaluations'
      },
      {
        level: 'proactive',
        text: 'We actively celebrate and promote security champions',
        description: 'Active promotion of security culture champions'
      },
      {
        level: 'resilient',
        text: 'Security mindset is woven into our core values and daily recognition',
        description: 'Security embedded in organizational values and daily culture'
      }
    ]
  },
  {
    id: 'pc-3',
    domain: 'People & Culture',
    question: 'How comfortable are employees with reporting security concerns or mistakes?',
    options: [
      {
        level: 'basic',
        text: 'People try to handle things themselves to avoid trouble',
        description: 'Fear-based culture discouraging reporting'
      },
      {
        level: 'reactive',
        text: 'People report issues when they have to, but prefer not to',
        description: 'Reluctant reporting due to potential consequences'
      },
      {
        level: 'compliant',
        text: 'We have formal reporting channels and people use them',
        description: 'Formal reporting systems with adequate usage'
      },
      {
        level: 'proactive',
        text: 'People actively look for and report potential issues',
        description: 'Proactive issue identification and reporting culture'
      },
      {
        level: 'resilient',
        text: 'Reporting and learning from mistakes is celebrated as continuous improvement',
        description: 'Learning culture that celebrates transparency and improvement'
      }
    ]
  },
  {
    id: 'pc-4',
    domain: 'People & Culture',
    question: 'How does your organization handle knowledge sharing and collaboration?',
    options: [
      {
        level: 'basic',
        text: 'Knowledge mostly stays with individuals who learned it',
        description: 'Individual knowledge silos'
      },
      {
        level: 'reactive',
        text: 'We share knowledge when someone asks or leaves the company',
        description: 'Reactive knowledge sharing upon request or departure'
      },
      {
        level: 'compliant',
        text: 'We have regular knowledge sharing sessions and documentation',
        description: 'Formal knowledge sharing processes and documentation'
      },
      {
        level: 'proactive',
        text: 'We actively facilitate cross-team learning and best practice sharing',
        description: 'Active cross-functional knowledge sharing initiatives'
      },
      {
        level: 'resilient',
        text: 'Knowledge flows freely across all levels with continuous learning mindset',
        description: 'Seamless knowledge flow with continuous learning culture'
      }
    ]
  },
  {
    id: 'pc-5',
    domain: 'People & Culture',
    question: 'How does your organization build security awareness and mindset?',
    options: [
      {
        level: 'basic',
        text: 'Security is seen as IT\'s responsibility',
        description: 'Security viewed as technical department responsibility'
      },
      {
        level: 'reactive',
        text: 'People understand security basics and follow rules when reminded',
        description: 'Basic security understanding with rule-following behavior'
      },
      {
        level: 'compliant',
        text: 'Security awareness is built through regular communication and training',
        description: 'Structured security awareness programs'
      },
      {
        level: 'proactive',
        text: 'People actively think about security implications in their daily work',
        description: 'Proactive security mindset in daily operations'
      },
      {
        level: 'resilient',
        text: 'Security thinking is natural and automatic across the organization',
        description: 'Intuitive security culture embedded in all activities'
      }
    ]
  },

  // Protection (5 questions)
  {
    id: 'pr-1',
    domain: 'Protection',
    question: 'How does your organization approach cybersecurity and data protection?',
    options: [
      {
        level: 'basic',
        text: 'We have basic antivirus and passwords',
        description: 'Minimal security controls'
      },
      {
        level: 'reactive',
        text: 'We add security measures after incidents or when required',
        description: 'Incident-driven security improvements'
      },
      {
        level: 'compliant',
        text: 'We follow industry standards and regulatory requirements',
        description: 'Standards-based security framework'
      },
      {
        level: 'proactive',
        text: 'We anticipate threats and implement preventive measures',
        description: 'Threat-anticipating security posture'
      },
      {
        level: 'resilient',
        text: 'Our security adapts automatically to emerging threats and business changes',
        description: 'Adaptive security with automatic threat response'
      }
    ]
  },
  {
    id: 'pr-2',
    domain: 'Protection',
    question: 'How does your organization handle access control and identity management?',
    options: [
      {
        level: 'basic',
        text: 'People have access to what they need, managed informally',
        description: 'Informal access management'
      },
      {
        level: 'reactive',
        text: 'We review and adjust access when there are issues or changes',
        description: 'Issue-driven access reviews and adjustments'
      },
      {
        level: 'compliant',
        text: 'We have formal access controls and regular access reviews',
        description: 'Formal access control framework with regular reviews'
      },
      {
        level: 'proactive',
        text: 'Access is automatically managed based on roles and risk levels',
        description: 'Automated role-based access with risk consideration'
      },
      {
        level: 'resilient',
        text: 'Identity and access adapt in real-time based on behavior and context',
        description: 'Context-aware adaptive access controls'
      }
    ]
  },
  {
    id: 'pr-3',
    domain: 'Protection',
    question: 'How does your organization protect against business disruption?',
    options: [
      {
        level: 'basic',
        text: 'We deal with disruptions as they happen',
        description: 'Reactive disruption response'
      },
      {
        level: 'reactive',
        text: 'We have basic backup systems and contact lists',
        description: 'Basic business continuity preparations'
      },
      {
        level: 'compliant',
        text: 'We have tested business continuity and disaster recovery plans',
        description: 'Formal tested business continuity planning'
      },
      {
        level: 'proactive',
        text: 'We actively monitor for threats and have multiple recovery options',
        description: 'Proactive threat monitoring with multiple recovery scenarios'
      },
      {
        level: 'resilient',
        text: 'Our operations can automatically adapt and continue despite disruptions',
        description: 'Self-healing operations with automatic disruption adaptation'
      }
    ]
  },
  {
    id: 'pr-4',
    domain: 'Protection',
    question: 'How does your organization handle vendor and third-party risk?',
    options: [
      {
        level: 'basic',
        text: 'We trust our vendors to handle their own security',
        description: 'Trust-based vendor relationships'
      },
      {
        level: 'reactive',
        text: 'We ask vendors about security when issues arise',
        description: 'Issue-triggered vendor security discussions'
      },
      {
        level: 'compliant',
        text: 'We have vendor security requirements and assessments',
        description: 'Formal vendor security assessment processes'
      },
      {
        level: 'proactive',
        text: 'We continuously monitor vendor risk and require security improvements',
        description: 'Continuous vendor risk monitoring and improvement'
      },
      {
        level: 'resilient',
        text: 'Vendor relationships are integrated into our risk ecosystem with real-time visibility',
        description: 'Integrated vendor risk ecosystem with real-time monitoring'
      }
    ]
  },
  {
    id: 'pr-5',
    domain: 'Protection',
    question: 'How does your organization approach incident response and crisis management?',
    options: [
      {
        level: 'basic',
        text: 'We figure out what to do when incidents happen',
        description: 'Ad-hoc incident response'
      },
      {
        level: 'reactive',
        text: 'We have basic incident response procedures and contacts',
        description: 'Basic incident response procedures'
      },
      {
        level: 'compliant',
        text: 'We have tested incident response plans with defined roles',
        description: 'Formal tested incident response capability'
      },
      {
        level: 'proactive',
        text: 'We simulate incidents and continuously improve our response capability',
        description: 'Proactive incident response testing and improvement'
      },
      {
        level: 'resilient',
        text: 'Our incident response is integrated with business operations and adapts automatically',
        description: 'Integrated adaptive incident response with business operations'
      }
    ]
  },

  // Proof it Works (5 questions)
  {
    id: 'pw-1',
    domain: 'Proof it Works',
    question: 'How does your organization measure the effectiveness of its operational controls?',
    options: [
      {
        level: 'basic',
        text: 'We assume things are working if there are no major problems',
        description: 'Assumption-based effectiveness assessment'
      },
      {
        level: 'reactive',
        text: 'We check controls when auditors ask or incidents happen',
        description: 'Event-driven control effectiveness checking'
      },
      {
        level: 'compliant',
        text: 'We have regular testing and monitoring of key controls',
        description: 'Scheduled control testing and monitoring programs'
      },
      {
        level: 'proactive',
        text: 'We continuously assess control effectiveness and make improvements',
        description: 'Continuous control effectiveness assessment and improvement'
      },
      {
        level: 'resilient',
        text: 'Control effectiveness is measured in real-time with automatic optimization',
        description: 'Real-time control effectiveness with automatic optimization'
      }
    ]
  },
  {
    id: 'pw-2',
    domain: 'Proof it Works',
    question: 'How does your organization demonstrate compliance to stakeholders?',
    options: [
      {
        level: 'basic',
        text: 'We provide information when specifically asked',
        description: 'Reactive compliance reporting upon request'
      },
      {
        level: 'reactive',
        text: 'We prepare compliance reports for audits and regulatory reviews',
        description: 'Audit-driven compliance documentation'
      },
      {
        level: 'compliant',
        text: 'We maintain comprehensive compliance documentation and evidence',
        description: 'Comprehensive compliance documentation and evidence management'
      },
      {
        level: 'proactive',
        text: 'We proactively share compliance status and improvements with stakeholders',
        description: 'Proactive stakeholder compliance communication'
      },
      {
        level: 'resilient',
        text: 'Compliance status is transparent and available in real-time to all stakeholders',
        description: 'Real-time transparent compliance visibility for stakeholders'
      }
    ]
  },
  {
    id: 'pw-3',
    domain: 'Proof it Works',
    question: 'How does your organization handle audit and assessment activities?',
    options: [
      {
        level: 'basic',
        text: 'Audits are stressful events we try to get through',
        description: 'Audit survival mindset'
      },
      {
        level: 'reactive',
        text: 'We prepare for audits when they\'re scheduled',
        description: 'Pre-audit preparation activities'
      },
      {
        level: 'compliant',
        text: 'We maintain audit readiness and have defined audit processes',
        description: 'Continuous audit readiness with formal processes'
      },
      {
        level: 'proactive',
        text: 'We use audits as opportunities for improvement and validation',
        description: 'Audit-driven improvement and validation opportunities'
      },
      {
        level: 'resilient',
        text: 'Audit and assessment insights are integrated into continuous improvement',
        description: 'Integrated audit insights for continuous organizational improvement'
      }
    ]
  },
  {
    id: 'pw-4',
    domain: 'Proof it Works',
    question: 'How does your organization track and report on key performance indicators?',
    options: [
      {
        level: 'basic',
        text: 'We track basic operational metrics when needed',
        description: 'Ad-hoc basic operational metrics'
      },
      {
        level: 'reactive',
        text: 'We prepare reports when requested by management or regulators',
        description: 'Request-driven reporting preparation'
      },
      {
        level: 'compliant',
        text: 'We have regular reporting on defined KPIs and metrics',
        description: 'Formal KPI reporting framework'
      },
      {
        level: 'proactive',
        text: 'We use metrics to drive decision-making and process improvements',
        description: 'Metrics-driven decision making and improvement'
      },
      {
        level: 'resilient',
        text: 'Our metrics provide real-time insights that automatically inform strategy',
        description: 'Real-time metrics driving automatic strategic insights'
      }
    ]
  },
  {
    id: 'pw-5',
    domain: 'Proof it Works',
    question: 'How does your organization validate that changes and improvements actually work?',
    options: [
      {
        level: 'basic',
        text: 'We implement changes and hope they work as intended',
        description: 'Implementation without validation'
      },
      {
        level: 'reactive',
        text: 'We check if changes worked when problems are reported',
        description: 'Problem-triggered change validation'
      },
      {
        level: 'compliant',
        text: 'We have formal testing and validation processes for changes',
        description: 'Formal change testing and validation procedures'
      },
      {
        level: 'proactive',
        text: 'We measure the impact of changes and continuously refine them',
        description: 'Impact measurement with continuous refinement'
      },
      {
        level: 'resilient',
        text: 'Changes are validated in real-time with automatic adjustment based on results',
        description: 'Real-time change validation with automatic adjustment'
      }
    ]
  }
];

/**
 * Shuffle questions for random order presentation
 */
export function getRandomizedQuestions(): AssessmentQuestion[] {
  const shuffled = [...PSYCHOMETRIC_QUESTIONS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get questions grouped by domain
 */
export function getQuestionsByDomain(): Record<string, AssessmentQuestion[]> {
  return PSYCHOMETRIC_QUESTIONS.reduce((acc, question) => {
    if (!acc[question.domain]) {
      acc[question.domain] = [];
    }
    acc[question.domain].push(question);
    return acc;
  }, {} as Record<string, AssessmentQuestion[]>);
}
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

export const assessmentQuestions: AssessmentQuestion[] = [
  // Leadership & Governance Domain
  {
    id: 'lg-1',
    domain: 'Leadership & Governance',
    question: 'How are organizational goals and values communicated to staff?',
    options: [
      {
        level: 'basic',
        text: 'They are not formally communicated — people learn by doing.',
        description: 'No formal communication process exists'
      },
      {
        level: 'reactive',
        text: 'Occasionally discussed during meetings but not actively reinforced.',
        description: 'Informal, inconsistent communication'
      },
      {
        level: 'compliant',
        text: 'Shared in onboarding and written materials; leadership refers to them.',
        description: 'Documented and referenced in formal processes'
      },
      {
        level: 'proactive',
        text: 'Regularly reinforced through communications and decision-making practices.',
        description: 'Actively integrated into leadership practices'
      },
      {
        level: 'resilient',
        text: 'Integrated into all aspects of leadership behavior, policy, and culture.',
        description: 'Deeply embedded across all organizational aspects'
      }
    ]
  },
  {
    id: 'lg-2',
    domain: 'Leadership & Governance',
    question: 'How often does leadership review and respond to performance or risk reports?',
    options: [
      {
        level: 'basic',
        text: 'Only in crisis situations.',
        description: 'Reactive approach to performance monitoring'
      },
      {
        level: 'reactive',
        text: 'Occasionally, when something goes wrong.',
        description: 'Problem-driven review process'
      },
      {
        level: 'compliant',
        text: 'According to scheduled reviews (monthly/quarterly).',
        description: 'Regular, structured review cycles'
      },
      {
        level: 'proactive',
        text: 'Reviews are integrated into decision-making cycles.',
        description: 'Performance data drives decision-making'
      },
      {
        level: 'resilient',
        text: 'Reviews are proactive, predictive, and drive continuous improvement initiatives.',
        description: 'Forward-looking, improvement-focused approach'
      }
    ]
  },
  {
    id: 'lg-3',
    domain: 'Leadership & Governance',
    question: 'How are roles and responsibilities managed in your organization?',
    options: [
      {
        level: 'basic',
        text: 'Everyone figures things out as they go.',
        description: 'No formal role definition process'
      },
      {
        level: 'reactive',
        text: 'Some basic job descriptions exist, but many overlaps or gaps.',
        description: 'Basic documentation with unclear boundaries'
      },
      {
        level: 'compliant',
        text: 'Roles are clearly defined, and people know who\'s responsible.',
        description: 'Clear role definition and accountability'
      },
      {
        level: 'proactive',
        text: 'Responsibility is tracked, reviewed, and adjusted as processes evolve.',
        description: 'Dynamic role management with regular review'
      },
      {
        level: 'resilient',
        text: 'There\'s a culture of ownership, with shared accountability and cross-functional clarity.',
        description: 'Ownership culture with flexible accountability'
      }
    ]
  },
  {
    id: 'lg-4',
    domain: 'Leadership & Governance',
    question: 'What is your leadership team\'s approach to change and adaptation?',
    options: [
      {
        level: 'basic',
        text: 'Change is resisted or delayed unless unavoidable.',
        description: 'Resistance to change as default approach'
      },
      {
        level: 'reactive',
        text: 'Leaders support change, but execution is inconsistent.',
        description: 'Supportive but inconsistent implementation'
      },
      {
        level: 'compliant',
        text: 'Leaders initiate change based on evidence or feedback.',
        description: 'Evidence-based change initiation'
      },
      {
        level: 'proactive',
        text: 'Leaders champion change and allocate resources to support it.',
        description: 'Active championing with resource allocation'
      },
      {
        level: 'resilient',
        text: 'Change is embraced as a strategic capability and is well-governed.',
        description: 'Change as core strategic capability'
      }
    ]
  },
  {
    id: 'lg-5',
    domain: 'Leadership & Governance',
    question: 'How do leaders model ethical and governance principles?',
    options: [
      {
        level: 'basic',
        text: 'There\'s no clear example — staff follow their own judgement.',
        description: 'No formal ethical leadership guidance'
      },
      {
        level: 'reactive',
        text: 'Leadership tries to uphold principles but may lack consistency.',
        description: 'Inconsistent application of principles'
      },
      {
        level: 'compliant',
        text: 'A formal code exists and is generally respected.',
        description: 'Documented code with general adherence'
      },
      {
        level: 'proactive',
        text: 'Leaders actively embody and promote governance principles.',
        description: 'Active modeling and promotion of principles'
      },
      {
        level: 'resilient',
        text: 'Ethical leadership is deeply embedded in culture, decisions, and reward systems.',
        description: 'Ethics integrated into all organizational systems'
      }
    ]
  },

  // Process Integrity Domain
  {
    id: 'pi-1',
    domain: 'Process Integrity',
    question: 'How are critical operational processes documented and maintained?',
    options: [
      {
        level: 'basic',
        text: 'They\'re not formally documented — most knowledge is in people\'s heads.',
        description: 'Informal, undocumented processes'
      },
      {
        level: 'reactive',
        text: 'Some documentation exists, but it\'s outdated or inconsistent.',
        description: 'Basic but poorly maintained documentation'
      },
      {
        level: 'compliant',
        text: 'Key processes are documented and accessible to relevant staff.',
        description: 'Documented and accessible process information'
      },
      {
        level: 'proactive',
        text: 'Documentation is reviewed regularly and updated after changes.',
        description: 'Regularly maintained and updated documentation'
      },
      {
        level: 'resilient',
        text: 'Processes are mapped, optimized, version-controlled, and continuously improved.',
        description: 'Comprehensive process management system'
      }
    ]
  },
  {
    id: 'pi-2',
    domain: 'Process Integrity',
    question: 'How are process breakdowns or anomalies handled?',
    options: [
      {
        level: 'basic',
        text: 'They\'re usually dealt with reactively and on a case-by-case basis.',
        description: 'Ad hoc reactive response'
      },
      {
        level: 'reactive',
        text: 'There\'s an informal effort to track them, but follow-up is inconsistent.',
        description: 'Informal tracking with inconsistent follow-up'
      },
      {
        level: 'compliant',
        text: 'They are logged, investigated, and lessons learned are recorded.',
        description: 'Formal logging and investigation process'
      },
      {
        level: 'proactive',
        text: 'Root cause analysis is conducted and corrective actions are tracked.',
        description: 'Systematic analysis with tracked improvements'
      },
      {
        level: 'resilient',
        text: 'Anomalies are predicted, monitored in real-time, and used to inform strategic changes.',
        description: 'Predictive monitoring with strategic integration'
      }
    ]
  },
  {
    id: 'pi-3',
    domain: 'Process Integrity',
    question: 'How do employees learn about the processes they are involved in?',
    options: [
      {
        level: 'basic',
        text: 'By watching others or figuring it out on their own.',
        description: 'Informal, self-directed learning'
      },
      {
        level: 'reactive',
        text: 'Through informal explanations or job-shadowing.',
        description: 'Basic informal training methods'
      },
      {
        level: 'compliant',
        text: 'Through structured onboarding and process guides.',
        description: 'Formal onboarding with documented guides'
      },
      {
        level: 'proactive',
        text: 'Through regular process training and reinforcement.',
        description: 'Ongoing training with regular reinforcement'
      },
      {
        level: 'resilient',
        text: 'Through simulations, cross-training, and a shared process knowledge platform.',
        description: 'Advanced training with knowledge sharing systems'
      }
    ]
  },
  {
    id: 'pi-4',
    domain: 'Process Integrity',
    question: 'How are risks related to process failure assessed and mitigated?',
    options: [
      {
        level: 'basic',
        text: 'Risks are not formally assessed unless something goes wrong.',
        description: 'Reactive risk assessment only'
      },
      {
        level: 'reactive',
        text: 'Known risks are addressed with informal practices.',
        description: 'Informal risk mitigation approaches'
      },
      {
        level: 'compliant',
        text: 'Formal risk assessments are done periodically.',
        description: 'Regular formal risk assessment process'
      },
      {
        level: 'proactive',
        text: 'Risk is continuously monitored and integrated into process controls.',
        description: 'Continuous monitoring with integrated controls'
      },
      {
        level: 'resilient',
        text: 'A predictive risk model informs dynamic adjustments and system-wide safeguards.',
        description: 'Predictive risk modeling with dynamic response'
      }
    ]
  },
  {
    id: 'pi-5',
    domain: 'Process Integrity',
    question: 'How is technology used to support process integrity?',
    options: [
      {
        level: 'basic',
        text: 'We mostly rely on manual processes.',
        description: 'Primarily manual process execution'
      },
      {
        level: 'reactive',
        text: 'Some tools are used but not standardized or maintained.',
        description: 'Ad hoc tool usage without standards'
      },
      {
        level: 'compliant',
        text: 'Core tools are consistently used to support daily operations.',
        description: 'Standardized tools for core operations'
      },
      {
        level: 'proactive',
        text: 'Technology is integrated and aligned to support process goals.',
        description: 'Integrated technology supporting process objectives'
      },
      {
        level: 'resilient',
        text: 'Smart systems and automation optimize, monitor, and secure critical processes.',
        description: 'Advanced automation with optimization and security'
      }
    ]
  },

  // People & Culture Domain
  {
    id: 'pc-1',
    domain: 'People & Culture',
    question: 'How are new employees introduced to your organization\'s culture and expectations?',
    options: [
      {
        level: 'basic',
        text: 'They\'re expected to pick things up informally.',
        description: 'Informal, unstructured introduction'
      },
      {
        level: 'reactive',
        text: 'They receive a basic orientation or briefing.',
        description: 'Basic orientation process'
      },
      {
        level: 'compliant',
        text: 'A structured onboarding program introduces roles and values.',
        description: 'Formal onboarding with role and value introduction'
      },
      {
        level: 'proactive',
        text: 'Onboarding includes mentoring and culture-building experiences.',
        description: 'Enhanced onboarding with mentoring support'
      },
      {
        level: 'resilient',
        text: 'Onboarding is immersive, ongoing, and part of a strong culture of learning.',
        description: 'Comprehensive, continuous onboarding process'
      }
    ]
  },
  {
    id: 'pc-2',
    domain: 'People & Culture',
    question: 'How are staff performance and behavior managed?',
    options: [
      {
        level: 'basic',
        text: 'Issues are only addressed when serious problems occur.',
        description: 'Crisis-driven performance management'
      },
      {
        level: 'reactive',
        text: 'Managers try to give feedback but it\'s not consistent.',
        description: 'Inconsistent feedback and management'
      },
      {
        level: 'compliant',
        text: 'There is a formal performance review process in place.',
        description: 'Structured performance review system'
      },
      {
        level: 'proactive',
        text: 'Performance is monitored, with coaching and improvement plans.',
        description: 'Active monitoring with development support'
      },
      {
        level: 'resilient',
        text: 'Staff are actively developed, recognized, and aligned with strategic goals.',
        description: 'Strategic alignment with active development'
      }
    ]
  },
  {
    id: 'pc-3',
    domain: 'People & Culture',
    question: 'How would you describe the overall morale and engagement of employees?',
    options: [
      {
        level: 'basic',
        text: 'Low — people mostly do the minimum.',
        description: 'Low engagement with minimal effort'
      },
      {
        level: 'reactive',
        text: 'Mixed — some are committed, others disengaged.',
        description: 'Variable engagement across organization'
      },
      {
        level: 'compliant',
        text: 'Acceptable — most people do their job reliably.',
        description: 'Reliable performance with acceptable engagement'
      },
      {
        level: 'proactive',
        text: 'Generally positive — teams work well together.',
        description: 'Good teamwork with positive environment'
      },
      {
        level: 'resilient',
        text: 'High — people feel connected to the mission and contribute proactively.',
        description: 'High engagement with mission alignment'
      }
    ]
  },
  {
    id: 'pc-4',
    domain: 'People & Culture',
    question: 'How are conflicts or personnel issues typically handled?',
    options: [
      {
        level: 'basic',
        text: 'Avoided or dealt with informally.',
        description: 'Informal or avoidance-based approach'
      },
      {
        level: 'reactive',
        text: 'Addressed when they escalate.',
        description: 'Escalation-driven conflict resolution'
      },
      {
        level: 'compliant',
        text: 'Managed using standard HR procedures.',
        description: 'Standard HR process-based resolution'
      },
      {
        level: 'proactive',
        text: 'Resolved constructively with clear support and follow-up.',
        description: 'Constructive resolution with ongoing support'
      },
      {
        level: 'resilient',
        text: 'Proactively prevented through a culture of openness and early intervention.',
        description: 'Prevention-focused with open culture'
      }
    ]
  },
  {
    id: 'pc-5',
    domain: 'People & Culture',
    question: 'How is learning and professional development approached?',
    options: [
      {
        level: 'basic',
        text: 'Staff are expected to learn on the job.',
        description: 'Self-directed, on-the-job learning only'
      },
      {
        level: 'reactive',
        text: 'Occasional training is offered when needed.',
        description: 'Ad hoc training based on immediate needs'
      },
      {
        level: 'compliant',
        text: 'Regular training is scheduled and tracked.',
        description: 'Structured training program with tracking'
      },
      {
        level: 'proactive',
        text: 'Learning paths are personalized and strategically planned.',
        description: 'Strategic, personalized development planning'
      },
      {
        level: 'resilient',
        text: 'A culture of continuous learning is embedded across all levels.',
        description: 'Embedded learning culture organization-wide'
      }
    ]
  },

  // Protection Domain
  {
    id: 'pr-1',
    domain: 'Protection',
    question: 'How is access to physical facilities or critical areas managed?',
    options: [
      {
        level: 'basic',
        text: 'It\'s mostly open — access is based on trust.',
        description: 'Trust-based access without formal controls'
      },
      {
        level: 'reactive',
        text: 'Basic locks or controls exist but aren\'t consistently enforced.',
        description: 'Basic controls with inconsistent enforcement'
      },
      {
        level: 'compliant',
        text: 'Authorized access is managed through defined procedures.',
        description: 'Formal access control procedures'
      },
      {
        level: 'proactive',
        text: 'Access is monitored, logged, and reviewed regularly.',
        description: 'Active monitoring with regular review'
      },
      {
        level: 'resilient',
        text: 'Access is risk-based, tightly controlled, and integrated with other systems.',
        description: 'Risk-based integrated access control system'
      }
    ]
  },
  {
    id: 'pr-2',
    domain: 'Protection',
    question: 'How are internal threats like fraud, sabotage, or negligence addressed?',
    options: [
      {
        level: 'basic',
        text: 'Rarely considered — we react if something happens.',
        description: 'Reactive response to internal threats'
      },
      {
        level: 'reactive',
        text: 'There\'s general awareness but no formal strategy.',
        description: 'Awareness without formal threat management'
      },
      {
        level: 'compliant',
        text: 'Policies exist and incidents are investigated.',
        description: 'Formal policies with incident investigation'
      },
      {
        level: 'proactive',
        text: 'There\'s proactive detection and targeted prevention.',
        description: 'Proactive detection with prevention measures'
      },
      {
        level: 'resilient',
        text: 'A behavioral risk framework actively monitors and mitigates internal threats.',
        description: 'Comprehensive behavioral risk management'
      }
    ]
  },
  {
    id: 'pr-3',
    domain: 'Protection',
    question: 'How is sensitive information protected?',
    options: [
      {
        level: 'basic',
        text: 'There are no specific protections.',
        description: 'No formal information protection measures'
      },
      {
        level: 'reactive',
        text: 'Some ad hoc measures (e.g., password protection) are in place.',
        description: 'Basic, inconsistent protection measures'
      },
      {
        level: 'compliant',
        text: 'Access is restricted, with basic information security protocols.',
        description: 'Formal access restrictions and basic protocols'
      },
      {
        level: 'proactive',
        text: 'Data handling policies are enforced and regularly reviewed.',
        description: 'Enforced policies with regular review'
      },
      {
        level: 'resilient',
        text: 'Information security is embedded in systems, training, and culture.',
        description: 'Comprehensive security integration across organization'
      }
    ]
  },
  {
    id: 'pr-4',
    domain: 'Protection',
    question: 'What level of situational awareness does your team maintain around protection risks?',
    options: [
      {
        level: 'basic',
        text: 'We usually find out about issues after they\'ve happened.',
        description: 'Reactive awareness after incidents occur'
      },
      {
        level: 'reactive',
        text: 'We rely on individuals to notice and report problems.',
        description: 'Individual-based problem identification'
      },
      {
        level: 'compliant',
        text: 'Security briefings or alerts are occasionally issued.',
        description: 'Periodic security communications'
      },
      {
        level: 'proactive',
        text: 'Risks are monitored and acted on in near real-time.',
        description: 'Real-time risk monitoring and response'
      },
      {
        level: 'resilient',
        text: 'Teams are trained to anticipate, escalate, and respond to emerging threats.',
        description: 'Proactive threat anticipation and response capability'
      }
    ]
  },
  {
    id: 'pr-5',
    domain: 'Protection',
    question: 'How are external risks (e.g. theft, intrusion, cyber threats) managed?',
    options: [
      {
        level: 'basic',
        text: 'There\'s no formal protection strategy.',
        description: 'No formal external threat management'
      },
      {
        level: 'reactive',
        text: 'We use basic deterrents like fences or antivirus.',
        description: 'Basic deterrent measures only'
      },
      {
        level: 'compliant',
        text: 'Security measures are defined and regularly checked.',
        description: 'Defined security measures with regular review'
      },
      {
        level: 'proactive',
        text: 'There\'s a coordinated strategy involving tech, people, and procedures.',
        description: 'Coordinated multi-layered security strategy'
      },
      {
        level: 'resilient',
        text: 'Protection is predictive, intelligence-led, and adaptive to evolving threats.',
        description: 'Predictive, adaptive threat management system'
      }
    ]
  },

  // Proof it Works Domain
  {
    id: 'pw-1',
    domain: 'Proof it Works',
    question: 'How do you know whether your operational systems are working effectively?',
    options: [
      {
        level: 'basic',
        text: 'We mostly rely on gut feel or experience.',
        description: 'Intuition-based effectiveness assessment'
      },
      {
        level: 'reactive',
        text: 'We look at outputs, but don\'t measure systematically.',
        description: 'Informal output review without systematic measurement'
      },
      {
        level: 'compliant',
        text: 'Key indicators are tracked and reviewed regularly.',
        description: 'Regular tracking of key performance indicators'
      },
      {
        level: 'proactive',
        text: 'Metrics are tied to goals and used to drive action.',
        description: 'Goal-oriented metrics driving decision-making'
      },
      {
        level: 'resilient',
        text: 'Performance data is integrated, benchmarked, and drives ongoing optimization.',
        description: 'Integrated performance data driving continuous optimization'
      }
    ]
  },
  {
    id: 'pw-2',
    domain: 'Proof it Works',
    question: 'How often are audits, reviews, or self-assessments conducted?',
    options: [
      {
        level: 'basic',
        text: 'Rarely or only when required.',
        description: 'Minimal review activity'
      },
      {
        level: 'reactive',
        text: 'Occasionally, when a problem arises.',
        description: 'Problem-driven review process'
      },
      {
        level: 'compliant',
        text: 'Conducted periodically using a checklist or framework.',
        description: 'Regular structured review process'
      },
      {
        level: 'proactive',
        text: 'Regular and structured, with follow-up actions documented.',
        description: 'Structured reviews with documented follow-up'
      },
      {
        level: 'resilient',
        text: 'Continuous, risk-based, and part of a culture of accountability.',
        description: 'Continuous review integrated into accountability culture'
      }
    ]
  },
  {
    id: 'pw-3',
    domain: 'Proof it Works',
    question: 'How are lessons learned captured and applied?',
    options: [
      {
        level: 'basic',
        text: 'We don\'t formally capture them.',
        description: 'No formal lesson capture process'
      },
      {
        level: 'reactive',
        text: 'Lessons are shared informally in teams.',
        description: 'Informal team-based lesson sharing'
      },
      {
        level: 'compliant',
        text: 'Key incidents are reviewed and documented.',
        description: 'Formal incident review and documentation'
      },
      {
        level: 'proactive',
        text: 'Lessons are tracked, shared, and linked to improvement actions.',
        description: 'Systematic lesson tracking with improvement integration'
      },
      {
        level: 'resilient',
        text: 'A formal learning loop ensures insights shape future strategy and processes.',
        description: 'Strategic learning loop influencing organizational direction'
      }
    ]
  },
  {
    id: 'pw-4',
    domain: 'Proof it Works',
    question: 'How do you demonstrate compliance or assurance to stakeholders (internal or external)?',
    options: [
      {
        level: 'basic',
        text: 'We respond to concerns as they come up.',
        description: 'Reactive response to stakeholder concerns'
      },
      {
        level: 'reactive',
        text: 'We provide information when requested.',
        description: 'Request-driven information provision'
      },
      {
        level: 'compliant',
        text: 'We maintain records and reports to meet requirements.',
        description: 'Formal records and reporting for compliance'
      },
      {
        level: 'proactive',
        text: 'We proactively share results and evidence of compliance.',
        description: 'Proactive compliance communication and evidence sharing'
      },
      {
        level: 'resilient',
        text: 'We use dashboards and audits to provide real-time, transparent assurance.',
        description: 'Real-time transparency through integrated assurance systems'
      }
    ]
  },
  {
    id: 'pw-5',
    domain: 'Proof it Works',
    question: 'How is evidence used in decision-making?',
    options: [
      {
        level: 'basic',
        text: 'Decisions are made based on experience or urgency.',
        description: 'Experience and urgency-driven decision-making'
      },
      {
        level: 'reactive',
        text: 'Evidence is sometimes used, but not consistently.',
        description: 'Inconsistent use of evidence in decisions'
      },
      {
        level: 'compliant',
        text: 'Decisions are supported by relevant data or reports.',
        description: 'Data-supported decision-making process'
      },
      {
        level: 'proactive',
        text: 'Data is analyzed to guide choices and reduce uncertainty.',
        description: 'Analytical approach to reduce decision uncertainty'
      },
      {
        level: 'resilient',
        text: 'Real-time evidence and trends drive continuous, informed decision-making.',
        description: 'Continuous evidence-driven decision optimization'
      }
    ]
  }
];

/**
 * Shuffle questions for random order presentation
 */
export function getRandomizedQuestions(): AssessmentQuestion[] {
  const shuffled = [...assessmentQuestions];
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
  return assessmentQuestions.reduce((acc, question) => {
    if (!acc[question.domain]) {
      acc[question.domain] = [];
    }
    acc[question.domain].push(question);
    return acc;
  }, {} as Record<string, AssessmentQuestion[]>);
}
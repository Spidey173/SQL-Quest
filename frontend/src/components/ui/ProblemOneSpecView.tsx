import React from 'react';
import { Code2, Building2, Layers, CheckCircle2 } from 'lucide-react';
import { ChallengeDetail } from '@/lib/types';

interface ProblemSpecViewProps {
  problem?: ChallengeDetail | null;
  onInsertCode?: (code: string) => void;
}

export const ProblemOneSpecView: React.FC<ProblemSpecViewProps> = ({ problem }) => {
  const codeId = problem?.code_id || 'Basics-001';
  const chapterTitle = problem?.chapter_title || 'Module 1: Basic SQL';
  const difficulty = problem?.difficulty || 'Easy';
  const title = problem?.title || 'Select All Columns from a Table';

  // Extract story (situation) and objective cleanly
  const story = problem?.story || (
    codeId === 'Basics-001'
      ? 'You have just joined TechCorp as a Data Analyst. The HR Operations Team needs a complete snapshot of all employee records currently stored in the company database to conduct an end-of-quarter headcount audit. Your task is to extract every record and every attribute from the employees table to ensure no team member is omitted from the audit report.'
      : codeId === 'Basics-002'
      ? 'The Internal Communications & Security team is preparing an updated employee directory for the company intranet. For privacy and performance reasons, they strictly request only public fields (employee ID, first name, last name, job title, and salary) without exposing internal infrastructure flags or manager IDs.'
      : codeId === 'Basics-003'
      ? 'The Engineering Department Lead is preparing quarterly performance bonuses specifically for staff in Department 101. To avoid pulling unrelated department data into the bonus calculations, they need a targeted list of employee records who belong exclusively to department 101.'
      : 'You are working as a data engineer preparing queries for business intelligence systems.'
  );

  const objective = problem?.objective || (
    codeId === 'Basics-001'
      ? 'Write an SQL query to retrieve all columns and all rows from the employees table.'
      : codeId === 'Basics-002'
      ? 'Write an SQL query to select only the employee_id, first_name, last_name, job_title, and salary columns from the employees table.'
      : codeId === 'Basics-003'
      ? 'Write an SQL query to retrieve all columns from the employees table for employees in department 101.'
      : 'Write an SQL query to solve the challenge objective.'
  );

  return (
    <div className="h-full overflow-y-auto p-5 sm:p-6 space-y-6 text-[#E6EDF3] select-text font-sans scrollbar-thin">
      {/* Top Tag & Header */}
      <div className="space-y-2 border-b border-[#242424] pb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-[4px] bg-[#1F160E] border border-[#3E2314] text-[#FF9B42] font-mono text-xs font-bold">
            {codeId} • {chapterTitle}
          </span>
          <span className="px-2 py-0.5 rounded-[4px] bg-[#0E1A12] border border-[#2E4A35] text-[#38A169] font-mono text-xs font-semibold">
            {difficulty} • Core Concept
          </span>
          <span className="px-2 py-0.5 rounded-[4px] bg-[#161B22] border border-[#30363D] text-[#8B949E] font-mono text-xs font-medium flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#58A6FF]" />
            <span>SQLite • Postgres • MySQL • Snowflake</span>
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F5F5] tracking-tight">
          {title}
        </h1>
      </div>

      <div className="space-y-6">
        {/* Real-World Business Situation */}
        <div className="rounded-xl border border-[#30363D] bg-[#161B22]/80 p-4 sm:p-5 space-y-2.5 shadow-sm">
          <span className="text-[11px] font-mono font-bold text-[#58A6FF] uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#58A6FF]" />
            REAL-WORLD BUSINESS SITUATION
          </span>
          <p className="text-sm sm:text-base text-[#C9D1D9] leading-relaxed font-sans">
            {story}
          </p>
        </div>

        {/* Problem Statement & Objective */}
        <div className="rounded-xl border border-[#FF6B00]/40 bg-[#140F0A] p-4 sm:p-5 space-y-2.5 shadow-sm">
          <span className="text-[11px] font-mono font-bold text-[#FF9B42] uppercase tracking-wider flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-[#FF9B42]" />
            PROBLEM STATEMENT & OBJECTIVE
          </span>
          <blockquote className="text-base sm:text-lg font-bold text-[#F5F5F5] pl-3.5 border-l-4 border-[#FF6B00] py-1 leading-snug">
            {objective}
          </blockquote>
        </div>

        {/* Expected Output Preview */}
        {problem?.expected_output && (
          <div className="rounded-xl border border-[#242424] bg-[#121212] p-4 sm:p-5 space-y-2.5 shadow-sm">
            <span className="text-[11px] font-mono font-bold text-[#48BB78] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#48BB78]" />
              EXPECTED OUTPUT SCHEMA & PREVIEW
            </span>
            <div className="bg-[#090909] border border-[#202020] rounded-lg p-3 font-mono text-xs text-[#D4D4D4] overflow-x-auto whitespace-pre leading-relaxed">
              {problem.expected_output.trim()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

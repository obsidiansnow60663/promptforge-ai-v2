# PromptForge AI

## Product Blueprint & Definition of Done

### ChatGPT Sites Edition --- Technology-Agnostic Source of Truth

**Document ID:** PFAI-SITES-BLUEPRINT\
**Version:** 2.0.0\
**Status:** Authoritative product baseline\
**Date:** 20 November 2026\
**Build and hosting target:** ChatGPT Sites\
**Product priority:** Quality-first\
**Default user language:** Bahasa Indonesia

------------------------------------------------------------------------

# 0. How to Use This Document

This document is the authoritative source of truth for building
PromptForge AI as a Site hosted by ChatGPT Sites.

It defines product behavior, user workflows, logical capabilities, data
requirements, quality standards, security requirements, implementation
phases, and acceptance criteria. It intentionally does **not** prescribe
a programming language, frontend framework, backend framework, ORM,
database engine, CSS framework, package manager, or external hosting
architecture.

The implementation must use the capabilities and supported runtime
available in ChatGPT Sites at build time. The builder may choose the
simplest supported implementation that satisfies this document.

## 0.1 Source-of-truth rules

1.  This document supersedes earlier stack-specific drafts and
    brainstorming notes.
2.  Product outcomes and acceptance criteria are stable; implementation
    details may change.
3.  Do not introduce a framework or external service merely because it
    is familiar.
4.  Verify Sites capabilities before depending on them.
5.  If a requirement cannot be implemented within the supported Sites
    runtime, document the limitation and propose the smallest safe
    alternative.
6.  Do not silently remove or weaken a requirement to fit an
    implementation.
7.  Record material product or architecture changes in a Change Log.
8.  A preview is not a completed release. Test the actual deployed Site
    URL.

## 0.2 Terminology

-   **Site:** The PromptForge AI web application created and hosted
    using ChatGPT Sites.
-   **Prompt session:** One workflow from original instruction through
    prompt generation and optional execution.
-   **Prompt Intelligence:** Understanding, structuring, translating,
    optimizing, and reviewing the user's instruction.
-   **Prompt Execution:** Sending an approved prompt to a selected LLM
    provider and model.
-   **Output Intelligence:** Adapting and validating the generated
    answer in the requested output language.
-   **Provider:** An external LLM service such as OpenAI, Anthropic, or
    Google.
-   **Model:** A specific model exposed by a provider.
-   **Logical component:** A responsibility that must be distinct; it
    does not have to be a separate service, agent, or deployment.
-   **Quality gate:** A rule that must pass before a workflow proceeds
    or is marked successful.

------------------------------------------------------------------------

# 1. Product Definition

## 1.1 Product vision

PromptForge AI is an Indonesian-first prompt engineering and multi-LLM
execution platform.

It accepts natural-language instructions, primarily in Bahasa Indonesia,
understands the user's intent and context, structures and optimizes the
instruction into a high-quality prompt (English by default), validates
that the original requirements remain intact, and optionally executes
the prompt through a selected LLM provider. The final answer is adapted
into natural, accurate Bahasa Indonesia by default.

PromptForge is not merely a translator, prompt rewriter, or chat
interface. Its central responsibility is to improve the clarity and
execution-readiness of a user's instruction **without silently changing
the user's intent**.

## 1.2 Product promise

> Turn an instruction written naturally in Bahasa Indonesia into a
> clear, validated, execution-ready prompt, and optionally run it
> through the user's chosen AI model while returning a faithful
> Indonesian result.

## 1.3 Product principles

1.  Preserve intent before optimizing wording.
2.  Preserve mandatory constraints, context, facts, quantities, names,
    identifiers, and deliverables.
3.  Optimize for task success, not prompt length.
4.  Use English technical terminology when it improves precision.
5.  Do not assume English always produces better reasoning or results.
6.  Do not perform literal translation when natural-language adaptation
    is required.
7.  Do not invent requirements, facts, sources, or assumptions.
8.  Separate prompt quality from execution-result quality.
9.  Use the smallest number of processing steps that can meet the
    quality target.
10. Make uncertainty, ambiguity, and failure visible.
11. Measure improvements using repeatable evaluations rather than
    marketing claims.
12. Prefer native ChatGPT Sites capabilities over unnecessary external
    infrastructure.

## 1.4 Product outcomes

A successful PromptForge experience must let users: - Enter an
instruction in Bahasa Indonesia. - Understand how PromptForge
interpreted that instruction. - See important constraints and expected
deliverables extracted from it. - Resolve important ambiguity before
execution. - Receive an optimized English prompt. - Review, edit, and
copy that prompt. - Optionally execute it using a selected provider and
model. - Receive a natural Indonesian answer by default. - Understand
whether quality checks passed and what warnings remain. - Reopen
previous work where persistence is enabled.

------------------------------------------------------------------------

# 2. Product Scope and Modes

## 2.1 Core modes

### Mode A --- Generate Only (P0)

Generate an optimized prompt without executing it.

Expected flow: 1. User enters an instruction. 2. PromptForge analyzes
intent and context. 3. PromptForge identifies important ambiguity. 4.
PromptForge structures and optimizes the prompt. 5. PromptForge reviews
the optimized prompt against the original instruction. 6. User receives
the optimized prompt, intent summary, and quality report. 7. User can
edit, copy, or save the result.

### Mode B --- Generate & Execute (P0)

Generate an optimized prompt and execute it.

Expected flow: 1. Complete the Generate Only pipeline. 2. Require user
confirmation if material warnings or unresolved ambiguity remain. 3.
Execute the approved prompt using the selected provider and model. 4.
Capture the provider response and available usage metadata. 5. Adapt the
result to the requested language, defaulting to Bahasa Indonesia. 6.
Validate meaning, completeness, language, and preservation of critical
details. 7. Present the final answer and execution information.

### Mode C --- Execute Existing Prompt (P1)

Execute a prompt supplied by the user without requiring the full
translation and optimization workflow.

### Mode D --- Compare Models (P1)

Execute the same approved prompt against two or more configured models,
apply equivalent adaptation and evaluation conditions, and compare
quality, latency, and token usage where available.

## 2.2 Functional requirements

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  FR-01                   Accept natural-language P0
                          input, Bahasa Indonesia 
                          by default              

  FR-02                   Analyze user intent and P0
                          task context            

  FR-03                   Extract requirements,   P0
                          constraints, and        
                          expected deliverables   

  FR-04                   Detect material         P0
                          ambiguity               

  FR-05                   Translate and optimize  P0
                          prompts into English by 
                          default                 

  FR-06                   Validate preservation   P0
                          of original meaning and 
                          requirements            

  FR-07                   Provide Generate Only   P0
                          mode                    

  FR-08                   Provide Generate &      P0
                          Execute mode            

  FR-09                   Support multiple LLM    P0
                          providers through a     
                          consistent integration  
                          pattern                 

  FR-10                   Adapt execution output  P0
                          into natural Bahasa     
                          Indonesia by default    

  FR-11                   Validate output         P0
                          consistency and         
                          preserve critical       
                          details                 

  FR-12                   Display understandable  P0
                          progress, status,       
                          errors, and warnings    

  FR-13                   Persist prompt sessions P0
                          and results where       
                          supported and enabled   

  FR-14                   Allow users to edit and P0
                          copy optimized prompts  

  FR-15                   Execute an existing     P1
                          user prompt             

  FR-16                   Compare outputs from    P1
                          multiple models         

  FR-17                   Maintain prompt         P1
                          versions and history    

  FR-18                   Provide a quality       P1
                          evaluation dashboard    

  FR-19                   Support custom system   P1
                          instructions            

  FR-20                   Provide prompt          P2
                          templates and a         
                          template library        

  FR-21                   Collect user feedback   P2
                          for quality improvement 

  FR-22                   Support optional local  P2
                          or additional providers 
                          if Sites permits        
  -----------------------------------------------------------------------

P0 is required for the first functional release; P1 follows after core
workflows are stable; P2 is a later enhancement.

## 2.3 Non-functional requirements

  -----------------------------------------------------------------------
  Category                            Requirement
  ----------------------------------- -----------------------------------
  Intent preservation                 Mandatory instructions must not be
                                      silently changed or removed

  Quality                             Improvements must be measured
                                      against meaningful baselines

  Reliability                         Provider errors, timeouts, and
                                      malformed responses must be handled

  Extensibility                       New providers should not require
                                      rewriting core prompt logic

  Security                            Secrets must not be exposed to
                                      visitors or client-side code

  Privacy                             User data must be isolated
                                      according to the access model

  Observability                       Record workflow status, stage
                                      failures, latency, and usage where
                                      available

  Usability                           Main workflow is understandable
                                      without exposing agent complexity

  Accessibility                       Keyboard use, labels, focus states,
                                      contrast, responsive layout

  Maintainability                     Logical boundaries and
                                      implementation decisions are
                                      documented

  Portability                         Product rules do not depend on one
                                      framework or database

  Cost awareness                      Usage and cost information must be
                                      accurate and clearly qualified
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 3. ChatGPT Sites Platform Strategy

## 3.1 Sites is the build and hosting platform, not the product architecture

PromptForge AI is designed as a web application hosted by ChatGPT Sites.

Use Sites capabilities where available and appropriate: - Site creation,
preview, refinement, publishing, and sharing. - Supported application
runtime. - Built-in data persistence where available. - File storage
where available. - Site access and visitor sign-in options where
available. - Supported integrations and connected tools where enabled. -
Site configuration and secrets management where supported. - Site
versions and deployment workflow.

Do not assume Sites behaves exactly like an unrestricted VPS, container
host, or conventional cloud platform.

## 3.2 Implementation freedom

The builder may choose the internal implementation based on the actual
Sites runtime.

Do not prescribe: - Programming language. - Frontend or backend
framework. - CSS framework. - Database engine or ORM. - Migration
tool. - Queue, cache, or worker technology. - Package manager. -
External deployment provider.

Require these outcomes instead: - The interface works in the Sites
environment. - Required data persists across visits. - External provider
calls are performed securely. - User data is isolated. - Provider
failures are recoverable and visible. - The Site is maintainable and
testable. - Only supported runtime and integration capabilities are
used.

## 3.3 Sites Capability Register

Before implementing a feature that depends on a Sites capability, verify
it in the current environment.

Maintain a register with:

  Field               Meaning
  ------------------- ----------------------------------------------------
  Capability          Feature being considered
  Availability        Verified / Not available / Unknown
  Evidence            Where or how it was verified
  Constraint          Runtime, quota, permission, or compatibility limit
  Product impact      Requirement affected
  Decision            Native capability / supported alternative / defer
  Verification date   Date last checked

At minimum, verify: - Supported runtime and language/framework
compatibility. - Persistent database or storage options. - File storage
and upload behavior. - Visitor identity and sign-in behavior. - Site
access and sharing settings. - Secure storage of provider credentials. -
Outbound HTTPS access to LLM providers. - Support for streaming or
long-running tasks. - Usage, storage, and hosting limits. - Export and
recovery options.

Do not invent a workaround for an unsupported capability. Record the
limitation and choose a safe alternative.

## 3.4 Sites operational constraints

The implementation and operating guide must account for these platform
characteristics, verifying current documentation before launch:

-   Building and editing a Site consume applicable Codex usage.
-   Running and hosting a Site have separate usage and storage
    considerations.
-   A deployment is a production deployment; review and save a version
    before deploying changes.
-   Restoring a Site version restores code, not necessarily database
    records or uploaded files.
-   Database records and uploaded files need their own backup/export
    strategy.
-   Database and file storage have platform limits and quotas.
-   Supported runtime and framework compatibility is not unlimited.
-   Access settings and public publishing options depend on plan and
    workspace configuration.

Official references: -
https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites -
https://learn.chatgpt.com/docs/sites -
https://learn.chatgpt.com/docs/sites/creating-a-site -
https://help.openai.com/en/articles/20001337-understanding-responsibilities-for-your-chatgpt-sites

## 3.5 Platform-first rule

Use a native Sites feature when it meets the requirement securely and
reliably.

Use an external service only when: 1. A necessary requirement cannot be
met with supported native capabilities. 2. The external dependency is
compatible with Sites. 3. Credentials and data can be protected. 4.
Cost, availability, and failure modes are documented. 5. The product
owner approves the dependency.

Do not create external infrastructure just to reproduce functionality
Sites already provides.

------------------------------------------------------------------------

# 4. Product Architecture

## 4.1 Three independent capabilities

1.  **Prompt Intelligence:** understand, translate, structure, optimize,
    and review the user's instruction.
2.  **Prompt Execution:** execute an approved prompt using a selected
    LLM provider and model.
3.  **Output Intelligence:** adapt the result into the requested
    language and validate its fidelity.

They may run within one Site application and share infrastructure. They
must remain logically separate so Generate Only works without invoking
execution.

## 4.2 High-level flow

``` mermaid
flowchart TD
    A[User enters Indonesian instruction]
    B[Input validation]
    C[Intent and context analysis]
    D[Ambiguity check]
    E{Material ambiguity?}
    F[Ask focused clarification]
    G[Prompt architecture]
    H[Translate and optimize]
    I[Prompt quality review]
    J{Critical requirements preserved?}
    K[Revise within bounded limit]
    L[Show approved prompt]
    M{Execution requested?}
    N[Provider and model selection]
    O[LLM execution]
    P[Output language adaptation]
    Q[Output quality validation]
    R[Show final Indonesian result]
    S[Persist history and metadata]

    A --> B --> C --> D --> E
    E -->|Yes| F --> C
    E -->|No| G --> H --> I --> J
    J -->|No| K --> I
    J -->|Yes| L --> M
    M -->|No| S
    M -->|Yes| N --> O --> P --> Q --> R --> S
```

## 4.3 Logical components

  -----------------------------------------------------------------------
  Component               Responsibility          Required output
  ----------------------- ----------------------- -----------------------
  Input Validator         Validate input and      Validated request
                          options                 

  Intent Analyzer         Identify goal, task,    Intent specification
                          audience, domain        

  Context Extractor       Extract context, facts, Context specification
                          constraints,            
                          preferences             

  Ambiguity Detector      Identify missing        Clarification items
                          information that        
                          changes the result      

  Prompt Architect        Select a suitable       Prompt structure
                          prompt structure        

  Translator & Optimizer  Create clear English    Optimized prompt
                          prompt without changing 
                          intent                  

  Prompt Quality Reviewer Compare source          Review report
                          requirements with       
                          optimized prompt        

  Provider Router         Select configured       Execution target
                          provider and model      

  Execution Engine        Execute approved prompt Raw result and metadata

  Indonesian Output       Adapt output naturally  Adapted output
  Adapter                 to requested language   

  Output Quality          Check fidelity,         Output review
  Validator               completeness, language  

  History Manager         Persist sessions,       Retrievable history
                          versions, results,      
                          metadata                

  Evaluation Engine       Run benchmark and       Evaluation report
                          quality evaluations     
  -----------------------------------------------------------------------

These are logical responsibilities, not a mandate to create one
autonomous agent per row. Use the fewest components that preserve clear
boundaries and quality.

## 4.4 Hybrid processing model

**Deterministic processing** - Input and option validation. - State
transitions. - Provider routing. - Structured schema validation. -
Required-field checks. - Numeric and identifier comparison. - Usage
normalization. - Retry limits and timeouts. - Persistence and
authorization. - Error categorization.

**LLM-powered processing** - Intent interpretation. - Context
extraction. - Ambiguity analysis. - Prompt structure selection. -
Translation and optimization. - Semantic review. - Indonesian language
adaptation. - Semantic quality evaluation.

**Quality control** - Required constraint coverage. - Preservation of
numbers, dates, names, identifiers. - Structured response validation. -
Language compliance. - Semantic fidelity. - Unsupported additions. -
Critical failure detection.

Do not invoke an LLM for work that can be done reliably with
deterministic logic.

------------------------------------------------------------------------

# 5. Prompt Intelligence Specification

## 5.1 Intent specification

The intent specification is the central reference for every later stage.

Example:

``` json
{
  "primary_goal": "Create a Python learning roadmap",
  "domain": "programming",
  "subdomain": "AI automation",
  "input_language": "id",
  "optimized_prompt_language": "en",
  "output_language": "id",
  "audience": "beginner",
  "complexity": "medium",
  "constraints": [
    "Beginner-friendly",
    "Practical exercises",
    "Progressive learning"
  ],
  "expected_output": [
    "Learning phases",
    "Timeline",
    "Projects",
    "Milestones"
  ],
  "ambiguities": []
}
```

Every later stage must preserve this specification. Changes must be
explicit and traceable.

## 5.2 Prompt construction rules

The optimized prompt should include only sections that improve the task.
Suitable sections: - Role or expertise, when relevant. - Objective. -
Context. - Input data. - Requirements. - Mandatory constraints. -
Process or task steps. - Output format. - Audience and tone. - Quality
criteria. - Explicit exclusions.

Do not add unnecessary role-play, verbosity, or generic
prompt-engineering jargon.

## 5.3 Domain-aware strategies

  -----------------------------------------------------------------------
  Domain                              Important prompt elements
  ----------------------------------- -----------------------------------
  Programming                         Requirements, environment,
                                      constraints, expected behavior,
                                      tests

  AI & Automation                     Trigger, workflow, tools,
                                      integrations, error handling

  Deep Research                       Research questions, evidence,
                                      source quality, citations,
                                      limitations

  Business Strategy                   Objective, market, assumptions,
                                      alternatives, risks, KPIs

  Content Creation                    Audience, platform, format, tone,
                                      content constraints

  Data Analysis                       Dataset, methodology, metrics,
                                      assumptions, expected output

  General Tasks                       Goal, context, constraints,
                                      deliverable
  -----------------------------------------------------------------------

The selected domain must be editable if classification is uncertain.

## 5.4 Translation and optimization rules

-   Translate intended meaning, not merely words.
-   Preserve context and constraints.
-   Use natural, professional English.
-   Use accurate technical terminology.
-   Preserve names, code, numbers, dates, URLs, identifiers, and quoted
    content.
-   Do not add unsupported requirements.
-   Do not remove details merely to shorten the prompt.
-   State the required final output language explicitly.
-   Flag ambiguity instead of silently guessing.
-   Optimize clarity, structure, and execution-readiness.

## 5.5 Clarification policy

-   If the task is sufficiently clear, proceed.
-   If a missing detail is non-critical, preserve uncertainty and state
    the assumption.
-   If ambiguity materially changes the result, ask a concise
    clarification.
-   For multiple independent critical ambiguities, use a compact
    clarification step rather than a long free-form interrogation.
-   Preserve existing answers when the user revises one answer.
-   Do not ask the same question again if the answer is already
    available in the session.
-   Do not execute while a critical ambiguity remains unresolved unless
    the user explicitly accepts a clearly stated assumption.

## 5.6 Prompt review loop

Default maximum automatic revision attempts: **2**.

Review outcomes: - **Pass:** all critical requirements preserved;
proceed. - **Revise:** a repairable requirement is missing or unclear;
provide specific revision instructions. - **Clarify:** user intent
cannot safely be inferred. - **Fail with warning:** review still fails
after the revision limit; show the prompt and unresolved issues without
presenting it as fully validated.

A high average score must never conceal a critical requirement failure.

------------------------------------------------------------------------

# 6. Multi-provider LLM Integration

## 6.1 Initial provider targets

The product should target: 1. OpenAI. 2. Anthropic. 3. Google Gemini.

Additional providers, including local model runtimes, are optional
future extensions.

Verify provider and model availability using current official
documentation at implementation time. Do not hardcode assumptions about
model availability, context limits, structured output, pricing, or
capabilities.

## 6.2 Provider abstraction requirement

All providers must be accessed through a consistent internal integration
contract.

The contract must normalize: - Provider identifier. - Model
identifier. - Input messages or prompt. - Generation options. - Response
content. - Finish status. - Token usage where available. - Latency. -
Provider error category. - Provider-specific metadata where useful.

Core prompt logic must not depend directly on one provider's SDK or
response format.

## 6.3 Provider selection

Support: - **Manual:** user selects provider and model. - **Preset:**
user selects a profile such as Quality, Balanced, or Fast. -
**Automatic:** future routing based on task requirements, capability,
availability, and measured evaluation results.

Quality-first does not mean choosing the most expensive model
automatically.

## 6.4 Provider failure behavior

-   Use bounded timeouts.
-   Retry only transient errors.
-   Apply bounded exponential backoff where supported.
-   Do not retry invalid credentials, quota exhaustion, or malformed
    requests without corrective action.
-   Do not silently switch provider or model.
-   If fallback is configured, disclose the actual provider/model used.
-   Preserve the prompt session when execution fails.
-   Show a useful error and recovery action.

## 6.5 Provider credentials

-   Never expose API keys in the browser or public Site content.
-   Use Sites-supported secret/configuration storage if verified.
-   If secure secret storage is unavailable for a required integration,
    do not store the key in ordinary page data, browser storage, or
    client-side code.
-   Document credential owner, scope, rotation, and removal process.
-   Never log secrets or authorization headers.
-   Treat user-supplied keys as sensitive data.

------------------------------------------------------------------------

# 7. Output Intelligence Specification

## 7.1 Default language behavior

  -----------------------------------------------------------------------
  Stage                               Default language
  ----------------------------------- -----------------------------------
  User input                          Bahasa Indonesia

  Intent/context representation       Structured, language-neutral fields
                                      where practical

  Optimized prompt                    English

  Final answer                        Bahasa Indonesia
  -----------------------------------------------------------------------

Users may change the output language.

## 7.2 Indonesian Output Adapter

The adapter must: 1. Receive the raw model result. 2. Identify requested
output language, audience, and tone. 3. Adapt wording and structure
naturally. 4. Preserve facts, names, numbers, dates, citations,
references, and technical details. 5. Retain English terminology when
more precise or commonly used. 6. Avoid adding unsupported facts or
conclusions. 7. Preserve the requested format. 8. Return warnings for
ambiguity or source inconsistency.

## 7.3 Output quality dimensions

Evaluate independently: - Semantic fidelity. - Completeness. -
Indonesian naturalness. - Technical terminology accuracy. - Audience
suitability. - Factual consistency. - Format compliance.

A fluent answer is not automatically accurate. Language quality and
factual correctness are separate dimensions.

------------------------------------------------------------------------

# 8. Quality Evaluation Framework

## 8.1 Prompt quality dimensions

Initial experimental weights:

  Dimension                                       Weight
  ------------------------------------------- ----------
  Intent preservation                                25%
  Requirement completeness                           25%
  Prompt clarity                                     15%
  Technical precision                                15%
  Output alignment                                   10%
  Factual integrity / unsupported additions          10%
  **Total**                                     **100%**

Each dimension is scored from 0 to 100.

`Prompt Quality Score = sum(weight × dimension score)`

Weights are initial hypotheses and must be calibrated using benchmark
cases and human review.

## 8.2 Critical failure conditions

A prompt fails review if it: - Changes the primary goal. - Drops a
mandatory constraint. - Changes a critical number, date, name, URL, or
identifier. - Adds a material requirement not requested or supported. -
Changes the requested output language. - Omits a required deliverable.

Critical failures override the aggregate score.

## 8.3 Output evaluation

Do not combine prompt quality and final output quality into one score.

Output evaluation must measure: - Semantic fidelity. - Factual
consistency. - Completeness. - Language naturalness. - Technical
terminology. - Audience suitability. - Format compliance.

## 8.4 Benchmark dataset

Create an initial dataset of at least 100 test cases.

  Category              Examples
  ------------------- ----------
  Programming                 20
  AI & Automation             20
  Deep Research               15
  Business Strategy           15
  Content Creation            15
  General Tasks               15
  **Total**              **100**

Each case must include original Indonesian prompt, expected intent,
mandatory constraints, expected output format, output language,
evaluation rubric, and critical failure conditions.

## 8.5 Baseline comparison

Compare under equivalent execution conditions: 1. Original Indonesian
prompt sent directly to the model. 2. Literal English translation. 3.
PromptForge optimized English prompt.

Use the same execution model and comparable settings where possible.

Measure task success, intent preservation, requirement completeness,
factual accuracy, output quality, Indonesian naturalness, latency, and
usage where available.

Use automated evaluation and human review. Do not rely on the generator
model as the sole judge of its own output when independent evaluation is
feasible.

## 8.6 Initial quality targets

These are targets to verify, not claims about current performance: - At
least 95% requirement preservation on the defined benchmark. - No
critical constraint changes in designated hard-requirement cases. - No
regression in output-language compliance. - Demonstrable task-success
improvement over the relevant baseline before claiming the optimizer
improves results.

Every reported result must identify dataset version, model/provider
versions, settings, evaluation method, and limitations.

------------------------------------------------------------------------

# 9. Data and Persistence Requirements

The exact storage mechanism is selected according to verified Sites
capabilities. The product must not assume a particular database engine.

## 9.1 Logical records

  -----------------------------------------------------------------------
  Record                              Purpose
  ----------------------------------- -----------------------------------
  User / Visitor identity             Identify the person using the Site,
                                      according to the access model

  Project                             Optional grouping of work

  Prompt Session                      One complete prompt workflow

  Prompt Version                      Original, optimized, and revised
                                      prompts

  Execution                           One provider/model execution

  Evaluation                          Prompt or output evaluation

  Provider Configuration              Provider/model settings and secure
                                      secret reference

  LLM Trace                           Stage, provider, model, usage,
                                      latency, and status

  Prompt Template                     Reusable prompt structures

  Feedback                            User rating and written feedback
  -----------------------------------------------------------------------

## 9.2 Prompt Session data

At minimum: - Session identifier. - Owner or visitor identity when
available. - Original input. - Input language. - Optimized prompt
language. - Output language. - Execution mode. - Domain and subdomain. -
Status. - Created and updated timestamps.

## 9.3 Prompt Version data

At minimum: - Version identifier. - Parent session. - Version number. -
Intent specification. - Context specification. - Optimized prompt. -
Review report. - Revision reason. - Created timestamp.

## 9.4 Execution data

At minimum: - Execution identifier. - Session and prompt version
reference. - Provider and model. - Status. - Raw result, subject to data
policy. - Adapted result. - Output language. - Input/output token counts
where available. - Latency where available. - Error category and safe
error message. - Created and completed timestamps.

## 9.5 Evaluation data

At minimum: - Evaluation identifier. - Item evaluated. - Evaluation
type. - Dimension scores. - Overall score where meaningful. - Pass/fail
status. - Critical failures. - Evaluation details. - Evaluator type:
deterministic, model-assisted, or human. - Created timestamp.

## 9.6 Data behavior

-   Saved work remains available after reload and a new visit within the
    supported identity and storage model.
-   Clearly distinguish temporary session state from persisted records.
-   Users must know when a result has not been saved.
-   Enforce ownership and access rules on the data operation itself, not
    only by hiding interface controls.
-   Do not expose one visitor's private records to another visitor.
-   Provide deletion of user-owned records where persistent history is
    offered.
-   Define what happens to executions and traces when a session is
    deleted.
-   Minimize retention of sensitive prompt content in operational logs.
-   Do not store provider credentials as ordinary user-visible records.
-   Document backup/export and recovery limitations of Sites.

## 9.7 Sites data recovery requirement

Restoring a Site version must not be treated as a database or
uploaded-file restore.

Before production use: - Define how important records can be exported. -
Define how uploaded files can be recovered. - Document manual recovery
steps. - Test recovery using non-production sample data. - State clearly
if full automated backup/restore is unavailable.

------------------------------------------------------------------------

# 10. User Experience and Site Screens

## 10.1 Main navigation

-   Dashboard.
-   Prompt Generator.
-   Prompt History.
-   Model Comparison (P1).
-   Templates (P2).
-   Settings.
-   About / Help.

## 10.2 Dashboard

Must show: - Clear primary action to create a prompt. - Recent sessions
if history is enabled. - Available workflow modes. - Provider
configuration status where relevant. - Helpful empty state for new
users.

## 10.3 Prompt Generator

Must include: - Original instruction input. - Domain selection or
automatic classification. - Output language setting, default
Indonesian. - Optimization profile where supported. - Generate Only /
Generate & Execute choice. - Provider/model selection when execution is
selected. - Clear submission and progress state.

Avoid asking users for technical configuration they do not need to
understand.

## 10.4 Clarification experience

If clarification is needed: - Show only questions that materially affect
the result. - Use a clear, compact question flow. - Offer sensible
options when ambiguity has a finite set of choices. - Preserve answers
when the user goes back or changes one answer. - Do not discard the
original prompt. - Allow the user to explicitly proceed with a stated
assumption when safe.

## 10.5 Prompt result screen

Show: - Short intent summary. - Extracted constraints and
deliverables. - Ambiguity or assumption warnings. - Optimized English
prompt. - Quality review status. - Edit and copy actions. - Execute
action if not yet executed.

## 10.6 Execution result screen

Show: - Final answer in Indonesian by default. - Provider and model
actually used. - Execution status. - Usage and latency where
available. - Quality warnings. - Raw provider output only in an optional
advanced view. - Feedback action when implemented.

## 10.7 History and settings

History: - Search or browse previous sessions. - Open prompt versions. -
Reopen results. - Identify failed and incomplete executions.

Settings: - Provider configuration. - Default output language. - Default
provider/model or profile. - Data retention and deletion controls where
supported. - Custom instructions when implemented.

## 10.8 UX and accessibility

-   Responsive on desktop, tablet, and mobile.
-   No essential action depends on hover.
-   Keyboard navigation works for primary interactions.
-   Forms have clear labels and validation messages.
-   Loading, success, warning, empty, and error states exist.
-   User input is retained after recoverable errors.
-   Optimized prompt and final answer are visually distinct.
-   Avoid unnecessary agent jargon in the default experience.
-   Never show success before the operation is confirmed.

------------------------------------------------------------------------

# 11. Security, Privacy, and Trust

## 11.1 Security baseline

-   Provider credentials must never be exposed in client-visible content
    or browser storage.
-   Use only verified secure secret/configuration facilities.
-   Enforce visitor identity and data ownership on server-side
    operations.
-   Validate all input and structured model output.
-   Protect against cross-user data access.
-   Do not render untrusted model output as executable markup.
-   Do not execute code or shell commands found in user prompts.
-   Apply request limits and abuse protections supported by the
    platform.
-   Do not log secrets or authorization headers.
-   Keep error messages useful without exposing internal details.
-   Review public content and user-generated content before publication.

## 11.2 Prompt injection defense

-   User instructions are untrusted data, not system-level policy.
-   System instructions and user content remain logically separate.
-   Outputs from earlier pipeline stages are untrusted and must be
    validated.
-   Provider tools receive only the permissions they need.
-   Model output must not change secrets, access rules, provider
    configuration, or application policy.
-   No autonomous external action occurs without explicit product
    requirements and appropriate authorization.

## 11.3 Privacy and access

Before sharing: - Review the Site access mode. - Check the exact
published URL. - Verify whether a visitor needs to sign in. - Test the
Site using an intended visitor account. - Confirm private prompt history
is not exposed. - Remove sample data and private test content. - Confirm
files and connected data are only used as intended.

## 11.4 Transparency

The interface must distinguish: - Generated prompt. - Provider-generated
raw answer. - Adapted final answer. - Automated quality review. - Human
feedback. - Verified facts versus assumptions or warnings.

Do not present an LLM-generated quality score as objective truth.

------------------------------------------------------------------------

# 12. Reliability and Error Handling

## 12.1 Required workflow states

Prompt session: - Draft. - Analyzing. - Needs clarification. -
Reviewing. - Ready. - Executing. - Completed. - Failed.

Execution: - Queued, if asynchronous execution is used. - Running. -
Completed. - Failed. - Cancelled, if cancellation is supported.

## 12.2 Error categories

At minimum: - Invalid input. - Missing required configuration. -
Provider authentication failure. - Provider quota or billing limit. -
Provider rate limit. - Provider timeout. - Provider unavailable. -
Invalid or malformed provider response. - Output validation failure. -
Storage or persistence failure. - Access denied. - Internal application
failure.

## 12.3 Error behavior

-   Preserve original user input.
-   Preserve successfully completed pipeline stages.
-   Explain which step failed.
-   Provide a safe retry or correction action where appropriate.
-   Do not repeat non-idempotent actions without checking status.
-   Do not silently mark a partial result as completed.
-   Do not conceal provider/model fallback behavior.
-   Show an honest warning when a quality check could not run.

------------------------------------------------------------------------

# 13. Implementation Roadmap

The roadmap is capability-based and does not assume a framework or
repository layout.

## Phase 0 --- Sites feasibility and product foundation

**Goal:** Confirm that PromptForge can be implemented safely in ChatGPT
Sites.

Tasks: - Review current Sites runtime and product documentation. -
Create the Sites Capability Register. - Verify persistent storage
options. - Verify visitor identity and access options. - Verify secure
configuration for provider credentials. - Verify outbound connectivity
to required providers. - Verify storage, hosting, and usage limits. -
Define MVP screen map and workflows. - Create the initial private Site
preview. - Record platform constraints and approved alternatives.

Deliverable: - Working private Site shell. - Verified capability
register. - Approved MVP scope. - No unsupported critical dependency
left implicit.

## Phase 1 --- Core user experience

**Goal:** Build the main application experience.

Tasks: - Dashboard. - Prompt Generator. - Workflow mode selection. -
Input validation. - Progress and status feedback. - Result layout. -
Responsive behavior. - Basic help and empty states.

Deliverable: - Navigable Site with a complete, testable user journey
using clearly labeled mock data where live AI integration is not ready.

## Phase 2 --- Prompt Intelligence

**Goal:** Deliver Generate Only.

Tasks: - Intent analysis. - Context extraction. - Constraint and
deliverable extraction. - Ambiguity detection. - Prompt architecture. -
Translation and optimization. - Prompt quality review. - Bounded
revision loop. - Edit and copy behavior. - Prompt session and version
persistence.

Deliverable: - User submits Indonesian input and receives a reviewed
English prompt with intent summary and clear warnings.

## Phase 3 --- Multi-provider execution

**Goal:** Deliver Generate & Execute.

Tasks: - Provider integration contract. - OpenAI integration. -
Anthropic integration. - Google Gemini integration. - Provider/model
selection. - Secure provider configuration. - Execution lifecycle. -
Usage and latency capture. - Error normalization and bounded retry. -
Execution history.

Deliverable: - Reviewed prompt executes using a selected configured
provider/model, and result is persisted and displayed.

## Phase 4 --- Indonesian Output Intelligence

**Goal:** Deliver a faithful, natural Indonesian final answer.

Tasks: - Indonesian Output Adapter. - Output format preservation. -
Semantic consistency checks. - Number, date, name, citation, and
identifier preservation. - Output quality validation. -
Language-specific test cases.

Deliverable: - Generate & Execute returns a natural Indonesian answer by
default, with optimized English prompt and warnings available
separately.

## Phase 5 --- Evaluation and comparison

**Goal:** Demonstrate product quality.

Tasks: - Build the 100-case benchmark. - Implement direct Indonesian
baseline. - Implement literal English translation baseline. - Implement
PromptForge optimized workflow evaluation. - Add model comparison. - Add
quality reporting. - Add user feedback. - Add prompt version comparison.

Deliverable: - Reproducible quality reports with methodology,
limitations, and comparable results.

## Phase 6 --- Hardening and release

**Goal:** Prepare a reliable published Site.

Tasks: - Authentication and access review. - Cross-user data isolation
tests. - Secret handling review. - Input and abuse protection. -
Error-state review. - Responsive and accessibility review. - Data export
and recovery procedure. - Performance and usage review. - Full
regression testing. - Private visitor testing. - Save a reviewed Site
version. - Deploy and test the published URL. - Configure intended
sharing audience.

Deliverable: - Published PromptForge AI Site with verified workflows,
access rules, operational documentation, and recovery plan.

------------------------------------------------------------------------

# 14. Definition of Done --- Global

A feature is Done only when all applicable criteria are verified.

## 14.1 Product correctness

-   [ ] The feature meets its stated user outcome.
-   [ ] It follows the product principles.
-   [ ] It preserves original user intent and mandatory constraints.
-   [ ] It does not silently invent requirements or facts.
-   [ ] Empty, loading, success, warning, and error states are handled
    where relevant.
-   [ ] The feature works in the actual ChatGPT Sites runtime.
-   [ ] No unsupported platform capability is assumed.
-   [ ] Limitations are documented and visible where they affect users.

## 14.2 User experience

-   [ ] The flow is understandable without internal technical knowledge.
-   [ ] The UI is responsive on supported screen sizes.
-   [ ] Primary interactions work with keyboard and pointer.
-   [ ] Forms have labels and clear validation.
-   [ ] User input survives recoverable errors.
-   [ ] Success is shown only after confirmed completion.
-   [ ] Optimized prompts and final outputs are clearly distinguished.

## 14.3 Data and persistence

-   [ ] Data that should persist remains available after reload and a
    new visit.
-   [ ] Temporary and persisted state are clearly distinguished.
-   [ ] Ownership and access rules are enforced on data operations.
-   [ ] Cross-user access tests pass where multiple visitors are
    supported.
-   [ ] Deletion and retention behavior is documented.
-   [ ] Sensitive data is not unnecessarily written to logs.
-   [ ] Export and recovery limitations are documented.

## 14.4 Security

-   [ ] Provider credentials are not exposed to visitors or client-side
    code.
-   [ ] Secrets use verified secure configuration facilities.
-   [ ] Access controls are tested using intended visitor identities.
-   [ ] Model output is treated as untrusted data.
-   [ ] Untrusted content cannot execute as code or markup.
-   [ ] Prompt injection protections are applied.
-   [ ] Errors do not reveal secrets or internal stack traces.
-   [ ] Public sharing has been explicitly reviewed.

## 14.5 Quality and testing

-   [ ] Critical acceptance scenarios pass.
-   [ ] Relevant automated or repeatable tests are run.
-   [ ] At least one realistic end-to-end test is completed.
-   [ ] Prompt quality and output quality are evaluated separately.
-   [ ] Critical failures cannot be hidden by aggregate scores.
-   [ ] Known defects and limitations are recorded.
-   [ ] Documentation reflects current behavior.

## 14.6 Sites deployment

-   [ ] Latest preview has been reviewed.
-   [ ] A version has been saved before deployment.
-   [ ] Deployment occurs only after review.
-   [ ] Actual deployed URL has been tested.
-   [ ] Intended visitor access has been tested.
-   [ ] Data persistence has been checked on the deployed Site.
-   [ ] Storage, usage, and recovery implications are documented.
-   [ ] Published audience matches the product owner's intent.

------------------------------------------------------------------------

# 15. Definition of Done --- Feature-specific

## 15.1 Prompt Intelligence DoD

-   [ ] Intent Analyzer identifies the primary goal.
-   [ ] Context Extractor captures relevant context.
-   [ ] Mandatory constraints are represented explicitly.
-   [ ] Expected deliverables and output format are extracted.
-   [ ] Material ambiguity is detected.
-   [ ] Non-critical ambiguity does not cause unnecessary questioning.
-   [ ] Prompt Architect selects a suitable structure.
-   [ ] Translator & Optimizer creates natural, clear English.
-   [ ] Numbers, names, dates, URLs, code, and identifiers are
    preserved.
-   [ ] No unsupported requirements are added.
-   [ ] Quality Reviewer checks optimized prompt against source intent.
-   [ ] Critical failures block automatic acceptance.
-   [ ] Automatic revision attempts are bounded to two by default.
-   [ ] Failed review returns warnings or a clarification request.
-   [ ] Original input and approved prompt remain distinguishable.

## 15.2 Generate Only DoD

-   [ ] User can submit an Indonesian instruction.
-   [ ] Workflow completes without invoking execution.
-   [ ] User receives an optimized prompt.
-   [ ] Intent summary is visible.
-   [ ] Constraints and deliverables are inspectable.
-   [ ] Quality status and warnings are visible.
-   [ ] User can edit and copy the prompt.
-   [ ] Session can be saved where persistence is enabled.
-   [ ] Failure does not destroy original input.

## 15.3 Multi-provider DoD

-   [ ] A common provider integration contract exists.
-   [ ] OpenAI integration works.
-   [ ] Anthropic integration works.
-   [ ] Google Gemini integration works.
-   [ ] Provider and model selection are explicit.
-   [ ] Actual provider and model are recorded.
-   [ ] Token usage and latency are stored where available.
-   [ ] Provider errors are normalized.
-   [ ] Timeout and retry behavior is bounded.
-   [ ] Invalid credentials do not trigger infinite retries.
-   [ ] Credentials are protected.
-   [ ] Provider failure does not destroy the prompt session.
-   [ ] Each provider has a repeatable integration test.

## 15.4 Generate & Execute DoD

-   [ ] Prompt quality review passes or user explicitly accepts a
    disclosed warning.
-   [ ] User can select a configured provider/model.
-   [ ] Execution uses the approved prompt version.
-   [ ] Execution status is accurate.
-   [ ] Provider result is captured.
-   [ ] Execution metadata is persisted where supported.
-   [ ] Failure and retry states are understandable.
-   [ ] Result can be reopened after reload.
-   [ ] Result is not marked complete before required validation
    finishes.

## 15.5 Indonesian Output Intelligence DoD

-   [ ] Output language defaults to Indonesian.
-   [ ] Indonesian is natural rather than literal translation.
-   [ ] Meaning and facts are preserved.
-   [ ] Numbers, dates, names, citations, URLs, and references remain
    intact.
-   [ ] Technical terminology remains accurate.
-   [ ] Requested format is preserved.
-   [ ] No unsupported facts are introduced.
-   [ ] Ambiguous or inconsistent source content is flagged.
-   [ ] Output quality is evaluated separately from prompt quality.
-   [ ] Raw provider output remains separately identifiable where
    retained.

## 15.6 History and Persistence DoD

-   [ ] Prompt sessions can be saved.
-   [ ] Prompt versions can be distinguished.
-   [ ] Execution results link to the prompt version used.
-   [ ] Saved records survive reload and a new visit under the intended
    identity model.
-   [ ] Users cannot access records they do not own or have permission
    to view.
-   [ ] Empty history and failed history states are handled.
-   [ ] Deletion behavior is tested.
-   [ ] Export and recovery process is documented.

## 15.7 Quality Evaluation DoD

-   [ ] Benchmark dataset has at least 100 examples.
-   [ ] Required task categories are represented.
-   [ ] Each case has expected intent and mandatory constraints.
-   [ ] Direct Indonesian baseline is evaluated.
-   [ ] Literal English translation baseline is evaluated.
-   [ ] PromptForge optimized workflow is evaluated.
-   [ ] Execution conditions are comparable.
-   [ ] Prompt quality and output quality are separate.
-   [ ] Critical failure conditions are included.
-   [ ] Automated and human evaluation are used.
-   [ ] Results include dataset and model versions.
-   [ ] Limitations are documented.
-   [ ] No unsupported performance claim is made.

## 15.8 ChatGPT Sites Release DoD

-   [ ] Sites capability register is current.
-   [ ] Implementation uses supported runtime capabilities.
-   [ ] No required feature depends on an unverified integration.
-   [ ] Preview is reviewed before deployment.
-   [ ] A reviewable Site version is saved.
-   [ ] Deployed URL is opened and tested.
-   [ ] Intended sharing permissions are configured.
-   [ ] A separate visitor test is performed where applicable.
-   [ ] Persistence is tested on the deployed Site.
-   [ ] Backup/export and recovery limitations are understood.
-   [ ] Usage and storage implications are documented.
-   [ ] Public content is reviewed for confidential or unauthorized
    material.

------------------------------------------------------------------------

# 16. MVP Acceptance Test Scenarios

  -----------------------------------------------------------------------
  ID                      Scenario                Expected result
  ----------------------- ----------------------- -----------------------
  AT-01                   User submits a clear    Reviewed English prompt
                          Indonesian prompt in    is returned
                          Generate Only           

  AT-02                   User submits a          Focused clarification
                          materially ambiguous    is requested
                          prompt                  

  AT-03                   Prompt contains strict  All critical values and
                          numbers and constraints constraints remain
                                                  unchanged

  AT-04                   Optimizer adds an       Reviewer flags the
                          unrequested deliverable unsupported addition

  AT-05                   User requests           Output language remains
                          Indonesian final output Indonesian

  AT-06                   User selects a          Selected provider/model
                          configured              is used
                          provider/model          

  AT-07                   Provider returns a      Bounded retry behavior
                          transient error         is applied

  AT-08                   Provider credentials    Clear configuration
                          are invalid             error; no infinite
                                                  retry

  AT-09                   Provider execution      Result and available
                          succeeds                usage metadata are
                                                  saved

  AT-10                   Output adapter adapts   Meaning, facts,
                          provider result         numbers, and references
                                                  are preserved

  AT-11                   Visitor attempts to     Access is denied
                          access another          
                          visitor's private       
                          session                 

  AT-12                   User reloads a saved    Persisted result can be
                          result                  retrieved

  AT-13                   User submits invalid    Clear validation is
                          input                   shown and input is
                                                  retained

  AT-14                   Provider integration is Honest, recoverable
                          unavailable             error is shown

  AT-15                   Site is opened using    Only intended audience
                          intended visitor access can access it

  AT-16                   A new Site version is   Critical workflows and
                          deployed                saved records remain
                                                  valid

  AT-17                   Prompt quality review   System does not falsely
                          cannot complete         show a passed review

  AT-18                   Output adaptation       Raw result is not
                          cannot complete         misrepresented as a
                                                  validated Indonesian
                                                  result
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 17. Release Gates

## 17.1 Private Prototype

Required: - Phase 0 and Phase 1 complete. - Main navigation and core
screens work. - Mock data is clearly labeled. - Site is not public. -
Sites capability assumptions are documented.

## 17.2 Functional MVP

Required: - Generate Only works end-to-end. - Prompt Intelligence and
quality review work. - Initial provider integrations are operational for
the planned MVP scope. - Generate & Execute works. - Indonesian Output
Intelligence works. - Required history/persistence behavior works. -
Critical acceptance tests pass. - No unresolved critical security issue
remains.

## 17.3 Public or Shared Release

Required: - Functional MVP release gate passes. - Actual published URL
is tested. - Access and visitor identity behavior are verified. -
Private data is not exposed. - Public content and sample data are
reviewed. - Provider credentials are protected. - Usage, storage, and
recovery procedures are documented. - Known limitations are disclosed. -
Owner explicitly approves the sharing audience.

------------------------------------------------------------------------

# 18. Explicit Non-goals

Not required for the initial release: - Training a foundation model. -
Fine-tuning before sufficient evaluation data exists. - Autonomous
agents with unrestricted tool access. - Microservices. - Separately
managed cloud infrastructure. - A specific frontend or backend
framework. - A specific database or ORM. - A complex queue or cache
unless required by verified Sites limitations. - Public prompt
marketplace. - Team collaboration beyond Sites access capabilities. -
Automatic self-modification of system instructions. - Automatic
execution of code or shell commands found in user prompts. - Claims that
English prompts universally produce better reasoning or results.

Fine-tuning may be reconsidered only after a meaningful benchmark
dataset exists and a measurable limitation cannot be solved effectively
through prompt design, structured outputs, routing, or application
logic.

------------------------------------------------------------------------

# 19. Instructions for ChatGPT Sites Builder and Codex

You are the product engineer responsible for building PromptForge AI as
a ChatGPT Site.

## 19.1 Primary objective

Build an Indonesian-first prompt engineering and multi-provider
execution application that follows this blueprint.

The final experience must: - Accept Indonesian instructions. - Preserve
original intent and constraints. - Produce reviewed English prompts. -
Support Generate Only and Generate & Execute. - Integrate multiple LLM
providers through a consistent abstraction. - Return natural Indonesian
output by default. - Validate prompt and output quality independently. -
Persist user work according to verified Sites data and identity
capabilities.

## 19.2 Platform instructions

-   Use ChatGPT Sites as the primary build and hosting platform.
-   Prefer native Sites capabilities when they meet the requirement.
-   Do not assume a specific framework, language, database, ORM, or
    hosting pattern.
-   Verify runtime compatibility before choosing implementation details.
-   Do not introduce external infrastructure without a demonstrated
    need.
-   Do not put provider secrets in client-side code or ordinary public
    data.
-   Document platform limitations and their impact.
-   Do not claim a feature works until tested in preview and, where
    relevant, the deployed Site.

## 19.3 Product instructions

-   Read this blueprint before implementation.
-   Preserve all P0 product requirements.
-   Keep Prompt Intelligence, Prompt Execution, and Output Intelligence
    logically separate.
-   Keep Generate Only independent from execution.
-   Never silently invent requirements or facts.
-   Detect material ambiguity and ask focused questions.
-   Keep automatic revision bounded.
-   Separate prompt quality from output quality.
-   Do not claim optimization improves results until benchmark evidence
    supports it.
-   Keep default user experience in Bahasa Indonesia.
-   Use English for optimized prompts by default.
-   Keep final answers in natural Bahasa Indonesia by default.

## 19.4 Implementation protocol

For every phase: 1. Review relevant requirements and acceptance
criteria. 2. Inspect the existing Site and its current state. 3. Verify
required Sites capabilities. 4. Propose the smallest coherent
implementation. 5. Implement without removing existing working features.
6. Test the changed workflow. 7. Test adjacent workflows for
regressions. 8. Review security, data access, and persistence. 9. Update
the capability register and documentation. 10. Report what is complete,
incomplete, and uncertain.

Do not proceed past a release gate while critical acceptance criteria
remain unverified.

## 19.5 First build task

Start with **Phase 0 and Phase 1 only**.

-   Verify relevant ChatGPT Sites capabilities.
-   Record verified and unverified assumptions.
-   Create a private Site preview for PromptForge AI.
-   Build the initial application shell and navigation.
-   Build dashboard and prompt generator interface.
-   Create Generate Only and Generate & Execute selection flow.
-   Add loading, empty, error, and success states.
-   Use clearly labeled mock data for workflows not yet integrated.
-   Ensure responsive behavior.
-   Do not pretend provider execution or persistence is live if mocked.

At completion, report: - Site preview status. - Capabilities verified. -
Capabilities not yet verified. - Screens and interactions implemented. -
Mocked versus working features. - Tests actually performed. - Known
limitations. - Next implementation phase.

------------------------------------------------------------------------

# 20. Change Control

Any material change to product behavior, provider support, persistence,
access, security, or evaluation must be documented.

Change record fields: - Change ID. - Date. - Request and rationale. -
Affected requirements. - User impact. - Sites capability impact. -
Security and data impact. - Acceptance criteria changed. - Approval
status.

Do not let implementation convenience silently redefine the product.

## 20.1 Decision hierarchy

When sources conflict: 1. The latest approved version of this blueprint
is authoritative. 2. An explicitly approved change record may supersede
a specific requirement. 3. Earlier stack-specific drafts are historical
references, not active constraints. 4. Current Sites documentation
governs what the platform supports. 5. The implementation must adapt to
verified platform capabilities without weakening product outcomes.

------------------------------------------------------------------------

# 21. Final Project Definition

PromptForge AI is an Indonesian-first prompt engineering and
multi-provider execution Site built and hosted using ChatGPT Sites.

It provides: - Intent and context understanding. - Domain-aware prompt
construction. - Indonesian-to-English prompt translation and
optimization. - Requirement-preservation review. - Generate Only and
Generate & Execute workflows. - Multi-provider LLM integration. -
Natural Indonesian output adaptation. - Independent prompt and output
quality evaluation. - History and persistence within verified Sites
capabilities. - Secure, reviewed, and controlled Site publishing.

The implementation is deliberately technology-agnostic. Product quality,
behavior, security, and acceptance criteria are fixed; the internal
implementation is free to use the simplest supported approach that meets
them.

## Governing principle

> Preserve meaning first. Optimize second. Execute deliberately.
> Validate the result. Demonstrate quality rather than assume it.

**End of PromptForge AI --- ChatGPT Sites Blueprint & DoD v2.0.0**

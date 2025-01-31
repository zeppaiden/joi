# Joi - AI Support Assistant

## Overview
Joi is an AI support assistant designed to help manage and navigate support tickets efficiently. The agent uses a structured approach to understand queries and provide relevant responses.

## Core Capabilities

### 1. Conversation Management
- Maintains conversation history for context
- Distinguishes between chat messages and ticket messages
- Handles follow-up questions and references to previous messages
- Provides clarification when message context is ambiguous

### 2. Ticket Operations
- Search tickets with multiple filters:
  - Priority (low, medium, high, urgent)
  - Status (open, in_progress, resolved, closed)
  - Creation/Update date ranges
  - Assignee
  - Customer
  - Organization
- Get detailed ticket information
- Find similar tickets/messages

### 3. User Management
- Find users by name, email, or role
- Get current user context and permissions
- Handle user-specific queries and permissions

### 4. System Information
- Provide information about its capabilities
- Explain its role and purpose
- Respond to general system queries

### 5. Administrative Actions
Based on user role permissions:

#### Admin Role
- Organization Management:
  - Update organization details
  - Manage organization settings
  - Add/remove organization members
- User Management:
  - Create/modify user accounts
  - Assign user roles
  - Manage permissions
- System Configuration:
  - Update system settings
  - Configure workflows
  - Manage integrations

#### Agent Role
- Ticket Management:
  - Update ticket status
  - Assign/reassign tickets
  - Add internal notes
  - Modify ticket priority
- Limited User Management:
  - View user information
  - Update own profile
  - Manage assigned tickets

#### Customer Role
- Ticket Interaction:
  - Create new tickets
  - View own tickets
  - Add responses
  - Update ticket status (close only)
- Profile Management:
  - Update own profile
  - Manage preferences

## Role-Based Permission Matrix

| Action                    | Admin | Agent | Customer |
|--------------------------|-------|--------|----------|
| View Tickets             | All   | All    | Own      |
| Create Tickets           | Yes   | Yes    | Yes      |
| Modify Tickets           | All   | All    | Own      |
| Delete Tickets           | Yes   | No     | No       |
| Manage Organizations     | Yes   | No     | No       |
| Manage Users             | Yes   | No     | No       |
| Update System Settings   | Yes   | No     | No       |
| View Reports             | Yes   | Yes    | Own      |
| Manage Internal Notes    | Yes   | Yes    | No       |

## Technical Architecture

### 1. Intent Analysis
The agent first analyzes user queries to determine:
- Intent type (SEARCH, DETAILS, SIMILAR, SYSTEM, GREETING, USER_QUERY, ADMIN_ACTION)
- Required parameters
- Time ranges
- Filters
- Message context
- Required permissions

### 2. Permission Verification
Before executing actions:
- Check user role and permissions
- Verify action authorization
- Handle unauthorized attempts gracefully
- Provide clear feedback on permission issues

### 3. Tool Selection
Based on intent and permissions, the agent can use these tools:
- `searchTickets`: Search and filter tickets
- `getTicketDetails`: Get detailed ticket information
- `findSimilarMessages`: Find similar content
- `findUsers`: Search users
- `getCurrentUser`: Get user context
- `getSystemInfo`: Get assistant information
- `updateOrganization`: Modify organization details (Admin only)
- `manageUsers`: User management operations (Admin only)
- `updateTicket`: Modify ticket details (Role-based)
- `manageSettings`: System configuration (Admin only)

## Query Examples

### Ticket Queries
```
"Show me all high priority tickets"
"Find unassigned tickets from last week"
"What tickets are assigned to John?"
"Get details for ticket #123"
"Find tickets similar to this issue"
```

### User Queries
```
"Who is handling my tickets?"
"Find all agents in the system"
"Show me John's current tickets"
```

### System Queries
```
"Who are you?"
"What can you do?"
"How do I use this system?"
```

### Conversation References
```
"What was my last message?"
"Can you clarify what you meant?"
"Show me the previous ticket we discussed"
```

### Administrative Queries (Admin Only)
```
"Update organization name to TechCorp"
"Add John as an agent to the organization"
"Configure default ticket priorities"
"Update system notification settings"
```

### Agent Queries
```
"Assign ticket #123 to Sarah"
"Add internal note to ticket #456"
"Update ticket priority to high"
"View all open tickets in my queue"
```

### Customer Queries
```
"Create a new support ticket"
"Check status of my tickets"
"Update my notification preferences"
"Close ticket #789"
```

## Current Limitations
1. No direct ticket creation/modification
2. No real-time updates (polling required)
3. Limited natural language processing for complex queries
4. No multi-step workflow automation
5. No integration with external systems

## Future Enhancements (Planned)
1. Ticket creation and modification
2. Real-time updates via WebSocket
3. Enhanced natural language understanding
4. Workflow automation
5. Integration with external tools
6. Advanced analytics and reporting

## Usage Guidelines
1. Be specific with queries
2. Provide context when needed
3. Use follow-up questions for clarification
4. Reference ticket numbers when available
5. Specify time ranges explicitly

## Error Handling
The agent handles:
1. Invalid queries
2. Missing permissions
3. Network errors
4. Rate limiting
5. Invalid parameters

## Development
- Built with Next.js and TypeScript
- Uses LangChain for LLM integration
- Integrates with Supabase for data storage
- Implements shadcn/ui components
- Follows project development rules 

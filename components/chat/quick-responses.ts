interface QuickResponse {
  id: string;
  category: string;
  title: string;
  content: string;
}

const quickResponsesData: QuickResponse[] = [
  {
    id: "1",
    category: "Greetings",
    title: "Welcome",
    content: "Hello! Thank you for reaching out. How can I assist you today?",
  },
  {
    id: "2",
    category: "Greetings",
    title: "Goodbye",
    content: "Thank you for contacting us. Have a great day!",
  },
  {
    id: "3",
    category: "Technical",
    title: "Reset Password",
    content:
      'To reset your password, please click on the "Forgot Password" link on the login page. You will receive an email with instructions.',
  },
  {
    id: "4",
    category: "Technical",
    title: "Account Access",
    content:
      "I understand you're having trouble accessing your account. Let me help you with that. Could you please verify your email address?",
  },
  {
    id: "5",
    category: "Billing",
    title: "Refund Process",
    content:
      "I understand you'd like to request a refund. Our refund process typically takes 3-5 business days to complete once initiated.",
  },
  {
    id: "6",
    category: "Billing",
    title: "Payment Failed",
    content:
      "I see your payment wasn't processed. This usually happens due to insufficient funds or expired card details. Would you like to try another payment method?",
  },
];

export async function getQuickResponses(): Promise<QuickResponse[]> {
  // Simulate network delay to demonstrate loading state
  await new Promise(resolve => setTimeout(resolve, 100));
  return quickResponsesData;
} 
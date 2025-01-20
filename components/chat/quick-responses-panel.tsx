'use client';

import { ChevronRight } from "lucide-react";
import { QuickResponse } from "./types";

interface QuickResponsesPanelProps {
  categories: string[];
  selectedCategory: string | null;
  quickResponses: QuickResponse[];
  onSelectCategory: (category: string) => void;
  onBack: () => void;
  onSelectResponse: (response: QuickResponse) => void;
}

export function QuickResponsesPanel({
  categories,
  selectedCategory,
  quickResponses,
  onSelectCategory,
  onBack,
  onSelectResponse,
}: QuickResponsesPanelProps) {
  return (
    <div className="absolute bottom-[72px] left-0 right-0 bg-white border-t border-gray-200 rounded-t-lg shadow-lg max-h-72 overflow-y-auto">
      <div className="p-2">
        {!selectedCategory ? (
          <div className="space-y-1">
            <h3 className="px-2 py-1 text-sm font-medium text-gray-500">
              Quick Responses
            </h3>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => onSelectCategory(category)}
                className="w-full px-2 py-2 text-left text-sm hover:bg-gray-50 rounded-lg flex items-center justify-between group"
              >
                <span>{category}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center px-2 py-1">
              <button
                onClick={onBack}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                ← Back
              </button>
              <h3 className="ml-2 text-sm font-medium text-gray-500">
                {selectedCategory}
              </h3>
            </div>
            {quickResponses
              .filter((r) => r.category === selectedCategory)
              .map((response) => (
                <button
                  key={response.id}
                  onClick={() => onSelectResponse(response)}
                  className="w-full px-2 py-2 text-left text-sm hover:bg-gray-50 rounded-lg"
                >
                  <div className="font-medium">{response.title}</div>
                  <div className="text-gray-500 truncate">
                    {response.content}
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
} 
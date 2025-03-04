import React, { useState, useEffect } from 'react';

interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="dashboard-overview"]',
    title: 'Welcome to Your Dashboard',
    content: 'This is your central hub for managing your spa operations.',
    placement: 'bottom'
  },
  {
    target: '[data-tour="appointments"]',
    title: 'Appointment Management',
    content: 'View and manage all your upcoming and past appointments here.',
    placement: 'right'
  },
  {
    target: '[data-tour="analytics"]',
    title: 'Analytics Overview',
    content: 'Track your spa\'s performance with key metrics and insights.',
    placement: 'left'
  },
  {
    target: '[data-tour="documents"]',
    title: 'Document Management',
    content: 'Upload and manage your spa\'s documents and FAQs to enhance the chatbot.',
    placement: 'right'
  },
  {
    target: '[data-tour="settings"]',
    title: 'Settings & Configuration',
    content: 'Customize your spa\'s details, services, and integration settings.',
    placement: 'left'
  }
];

interface TooltipProps {
  step: TourStep;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  currentStep: number;
  totalSteps: number;
}

const Tooltip: React.FC<TooltipProps> = ({
  step,
  onNext,
  onPrev,
  onClose,
  currentStep,
  totalSteps
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      const tooltipPosition = calculatePosition(rect, step.placement || 'bottom');
      setPosition(tooltipPosition);
    }
  }, [step]);

  const calculatePosition = (targetRect: DOMRect, placement: string) => {
    const spacing = 10;
    switch (placement) {
      case 'top':
        return {
          top: targetRect.top - spacing,
          left: targetRect.left + targetRect.width / 2
        };
      case 'bottom':
        return {
          top: targetRect.bottom + spacing,
          left: targetRect.left + targetRect.width / 2
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left - spacing
        };
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + spacing
        };
      default:
        return { top: targetRect.bottom + spacing, left: targetRect.left };
    }
  };

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-lg p-4 max-w-xs"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
      <p className="text-gray-600 mb-4">{step.content}</p>
      <div className="flex justify-between items-center">
        <div className="space-x-2">
          <button
            onClick={onPrev}
            disabled={currentStep === 0}
            className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={onNext}
            className="px-3 py-1 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600"
          >
            {currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
        <button
          onClick={() => {
            // Store tour progress before closing
            localStorage.setItem('tour_progress', currentStep.toString());
            onClose();
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          Save & Exit
        </button>
      </div>
      <div className="mt-2 text-sm text-gray-400">
        Step {currentStep + 1} of {totalSteps}
      </div>
    </div>
  );
};

interface GuidedTourProps {
  isOpen: boolean;
  onComplete: () => void;
}

const GuidedTour: React.FC<GuidedTourProps> = ({ isOpen, onComplete }) => {
  // Initialize currentStep from localStorage or start from beginning
  const [currentStep, setCurrentStep] = useState(() => {
    const savedProgress = localStorage.getItem('tour_progress');
    return savedProgress ? parseInt(savedProgress, 10) : 0;
  });

  useEffect(() => {
    if (isOpen) {
      // Add highlight effect to current target
      const element = document.querySelector(tourSteps[currentStep].target);
      if (element) {
        element.classList.add('ring-2', 'ring-primary-500', 'ring-offset-2');
      }

      return () => {
        // Remove highlight effect
        const element = document.querySelector(tourSteps[currentStep].target);
        if (element) {
          element.classList.remove('ring-2', 'ring-primary-500', 'ring-offset-2');
        }
      };
    }
  }, [isOpen, currentStep]);

  const handleNext = () => {
    if (currentStep === tourSteps.length - 1) {
      // Clear tour progress on completion
      localStorage.removeItem('tour_progress');
      // Mark tour as completed
      localStorage.setItem('tour_completed', 'true');
      onComplete();
    } else {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      // Save progress
      localStorage.setItem('tour_progress', nextStep.toString());
    }
  };

  const handlePrev = () => {
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    // Save progress
    localStorage.setItem('tour_progress', prevStep.toString());
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      <Tooltip
        step={tourSteps[currentStep]}
        onNext={handleNext}
        onPrev={handlePrev}
        onClose={onComplete}
        currentStep={currentStep}
        totalSteps={tourSteps.length}
      />
    </>
  );
};

export default GuidedTour; 
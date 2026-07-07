import * as React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Step {
  label: string;
  description: string;
}

interface ProgressStepperProps {
  steps: Step[];
  currentStep: number;
}

export function ProgressStepper({ steps, currentStep }: ProgressStepperProps) {
  return (
    <div className="w-full py-4">
      {/* Mobile view */}
      <div className="flex md:hidden items-center justify-between px-4">
        <div className="flex flex-col">
          <span className="text-xs text-on-surface/50 font-medium uppercase tracking-wider">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-base font-bold text-on-background">
            {steps[currentStep].label}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-2 rounded-full transition-all duration-300 ease-emphasized',
                index === currentStep
                  ? 'w-6 bg-primary'
                  : index < currentStep
                  ? 'w-2 bg-success'
                  : 'w-2 bg-border'
              )}
            />
          ))}
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden md:flex items-center justify-between w-full max-w-4xl mx-auto relative px-6">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <React.Fragment key={index}>
              {/* Step circle */}
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ease-emphasized relative',
                    isCompleted
                      ? 'bg-success border-success text-white'
                      : isActive
                      ? 'border-primary bg-primary-container text-primary font-bold'
                      : 'border-border bg-surface text-on-surface/40'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}

                  {/* Active glow */}
                  {isActive && (
                    <motion.div
                      layoutId="activeGlow"
                      className="absolute -inset-1 border border-primary/30 rounded-full"
                      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    />
                  )}
                </div>

                {/* Step labels */}
                <div className="mt-2 text-center absolute top-12 w-32">
                  <p
                    className={cn(
                      'text-sm font-medium transition-colors duration-200',
                      isActive ? 'text-primary font-semibold' : 'text-on-surface/60'
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-on-surface/40 hidden lg:block">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 bg-border mx-2 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-success origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isCompleted ? 1 : 0 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                  />
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-primary origin-left"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 0.5 }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Spacing for desktop labels which are absolute positioned */}
      <div className="hidden md:block h-10" />
    </div>
  );
}

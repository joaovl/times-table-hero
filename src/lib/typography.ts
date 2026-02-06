// Shared typography configuration
// Main game area is the baseline for all font sizes

export const typography = {
  // Game question display (main baseline)
  game: {
    question: {
      mobile: 'text-5xl',      // 48px
      tablet: 'md:text-6xl',   // 60px
      desktop: 'lg:text-7xl',  // 72px
    },
    equals: {
      mobile: 'text-2xl',      // 24px
      tablet: 'md:text-3xl',   // 30px
    },
    answer: {
      mobile: 'text-3xl',      // 30px
      tablet: 'md:text-4xl',   // 36px
    },
    input: {
      mobile: 'text-2xl',      // 24px
      tablet: 'md:text-4xl',   // 36px
    },
  },

  // Setup screens (GameSetup and PrintResources) - SHARED
  // Mobile-optimized with knowledge from GameSetup
  setup: {
    title: {
      mobile: 'text-[28px]',     // 28px mobile
      tablet: 'md:text-[40px]',  // 40px desktop
    },
    subtitle: {
      mobile: 'text-[13px]',     // 13px mobile
      tablet: 'md:text-[16px]',  // 16px desktop
    },
    cardHeading: {
      mobile: 'text-[14px]',     // 14px mobile
      tablet: 'md:text-[20px]',  // 20px desktop
    },
    tableNumber: {
      mobile: 'text-base',       // 16px mobile
      tablet: 'md:text-xl',      // 20px desktop
    },
    button: {
      mobile: 'text-xs',         // 12px mobile
      tablet: 'md:text-sm',      // 14px desktop
    },
  },

  // Worksheet derives from game baseline
  // Using proportional scaling: ~40% of game size for compact grid
  worksheet: {
    question: {
      print: {
        20: '18pt',   // ~40% of 48px
        40: '17pt',
        60: '16pt',
        80: '15pt',
        100: '14pt',
        125: '13pt',
      },
      screen: {
        mobile: 'text-lg',     // 18px (~40% of 48px)
        tablet: 'md:text-xl',  // 20px (~40% of 48px)
      },
    },
    header: {
      title: {
        mobile: 'text-xl',     // 20px
        tablet: 'md:text-2xl', // 24px
      },
      subtitle: {
        mobile: 'text-sm',     // 14px
        tablet: 'md:text-base',// 16px
      },
    },
  },
} as const;

// Helper to get worksheet print font size based on question count
export function getWorksheetPrintFontSize(questionCount: number): string {
  const rows = Math.ceil(questionCount / 5);

  if (rows <= 4) return typography.worksheet.question.print[20];
  if (rows <= 8) return typography.worksheet.question.print[40];
  if (rows <= 12) return typography.worksheet.question.print[60];
  if (rows <= 16) return typography.worksheet.question.print[80];
  if (rows <= 20) return typography.worksheet.question.print[100];
  return typography.worksheet.question.print[125];
}

// Helper to get combined setup screen class strings
export function getSetupClasses() {
  return {
    title: `${typography.setup.title.mobile} ${typography.setup.title.tablet}`,
    subtitle: `${typography.setup.subtitle.mobile} ${typography.setup.subtitle.tablet}`,
    cardHeading: `${typography.setup.cardHeading.mobile} ${typography.setup.cardHeading.tablet}`,
    tableNumber: `${typography.setup.tableNumber.mobile} ${typography.setup.tableNumber.tablet}`,
    button: `${typography.setup.button.mobile} ${typography.setup.button.tablet}`,
  };
}

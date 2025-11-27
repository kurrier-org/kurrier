import React from "react";

const DAYS = [
    { label: "SUN", date: 30 },
    { label: "MON", date: 1 },
    { label: "TUE", date: 2 },
    { label: "WED", date: 3 },
    { label: "THU", date: 4 },
    { label: "FRI", date: 5 },
    { label: "SAT", date: 6 },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHourLabel(hour: number) {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
}

export function WeekGrid() {
    return (
        <div className="w-full h-full ">
        {/*<div className="w-full h-full bg-white">*/}
            <div className="overflow-hidden text-xs text-neutral-700">

                <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b dark:border-neutral-700 border-neutral-200 bg-neutral-50 dark:bg-neutral-800 w-full">
                    <div className="flex items-center justify-start px-3 py-2 text-xxs text-neutral-500 dark:text-brand-foreground">
                        GMT-06
                    </div>
                    {DAYS.map((d) => (
                        <div key={d.label} className="flex flex-col items-center justify-center py-2">
                              <span className="text-xxs tracking-wide text-neutral-500 dark:text-brand-foreground">
                                {d.label}
                              </span>
                            <span className="text-lg font-medium text-neutral-900 dark:text-brand-foreground">
                                {d.date}
                            </span>
                        </div>
                    ))}
                </div>


                <div className="flex flex-1 flex-col h-[calc(100vh-8rem)] overflow-y-auto">
                    <div className="grid grid-cols-[64px_repeat(7,1fr)]">
                        <div className="border-r border-neutral-200 bg-neutral-100 dark:bg-neutral-900 dark:border-neutral-700">
                            {HOURS.map((hour) => (
                                <div key={hour} className="h-12 border-b border-neutral-200 dark:border-neutral-700 flex items-start justify-end pr-3 pt-1 text-xxs text-neutral-400 dark:text-brand-foreground">
                                    {formatHourLabel(hour)}
                                </div>
                            ))}
                        </div>

                        {/* Day columns */}
                        {DAYS.map((day, dayIndex) => (
                            <div key={day.label ?? dayIndex} className="relative border-r last:border-r-0 border-neutral-200 dark:border-neutral-700">
                                {HOURS.map((hour) => (
                                    <div key={`${dayIndex}-${hour}`} className="h-12 border-b border-neutral-100 relative dark:border-neutral-700">
                                        {/* event blocks will go here later */}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}



// import React from "react";
//
// const days = [
//     { label: "SUN", date: 30 },
//     { label: "MON", date: 1 },
//     { label: "TUE", date: 2 },
//     { label: "WED", date: 3 },
//     { label: "THU", date: 4 },
//     { label: "FRI", date: 5 },
//     { label: "SAT", date: 6 },
// ];
//
// const hours = Array.from({ length: 24 }, (_, i) => i);
//
// function formatHourLabel(hour: number) {
//     if (hour === 0) return "12 AM";
//     if (hour < 12) return `${hour} AM`;
//     if (hour === 12) return "12 PM";
//     return `${hour - 12} PM`;
// }
//
// export function WeekGrid() {
//     return (
//         <div className="w-full h-full bg-white">
//             <div className="overflow-hidden text-xs text-neutral-700">
//
//                 <div className="grid grid-cols-[auto_repeat(7,1fr)] border-b border-neutral-200 bg-neutral-50 sticky w-full">
//                     <div className="flex items-center justify-start px-3 py-2 text-[11px] text-neutral-500">
//                         GMT
//                     </div>
//                     {days.map((d) => (
//                         <div key={d.label} className="flex flex-col items-center justify-center py-2">
//                               <span className="text-[11px] tracking-wide text-neutral-500">
//                                 {d.label}
//                               </span>
//                             <span className="text-lg font-medium text-neutral-900">
//                                 {d.date}
//                               </span>
//                         </div>
//                     ))}
//                 </div>
//
//                 <div className="flex flex-1 flex-col h-[calc(100vh-8rem)] overflow-scroll">
//                     <div className="grid grid-cols-[auto_repeat(7,1fr)]">
//                         <div className="border-r border-neutral-200 bg-neutral-50">
//                             {hours.map((h) => (
//                                 <div key={h} className="h-12 border-b border-neutral-100 flex items-start justify-center pr-3 pt-1 text-[11px] text-neutral-400">
//                                     {formatHourLabel(h)}
//                                 </div>
//                             ))}
//                         </div>
//
//                         {days.map((_, dayIndex) => {
//                             return (
//                                 <div
//                                     key={dayIndex}
//                                     className="relative border-r last:border-r-0 border-neutral-200"
//                                 >
//                                     {hours.map((h) => (
//                                         <div
//                                             key={h}
//                                             className="h-12 border-b border-neutral-100 relative"
//                                         >
//
//                                         </div>
//                                     ))}
//                                 </div>
//                             );
//                         })}
//                     </div>
//                 </div>
//
//             </div>
//         </div>
//     );
// }
//
//
//
//
//
//

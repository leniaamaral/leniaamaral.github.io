// experiment.js

// Inject CSS for centering and stacking elements
const style = document.createElement('style');
style.innerHTML = `
  .jspsych-content {
    display: flex;
    flex-direction: column;  /* stack elements vertically */
    justify-content: center;
    align-items: center;
    height: 100vh;
    text-align: center;
  }
  video {
    display: block;
    margin: auto;
  }
`;
document.head.appendChild(style);

// Initialize jsPsych
const jsPsych = initJsPsych({
  on_finish: function() {
    console.log("Experiment complete.");
  }
});

// Fullscreen trials
const enterFullscreenTrial = {
  type: jsPsychFullscreen,
  fullscreen_mode: true,
  message: '<p style="font-size:24px;">The experiment will switch to full screen mode. Press Continue.</p>',
  button_label: "Continue"
};

const exitFullscreenTrial = {
  type: jsPsychFullscreen,
  fullscreen_mode: false,
  message: '<p style="font-size:24px;">Exiting full screen. Thank you for participating!</p>',
  button_label: "Finish"
};

// Blank trial to clear the screen between stimuli
const blankTrial = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "",
  trial_duration: 500,
  choices: []
};

// CSV Loader (splits rows using semicolon)
async function loadCSV(filename) {
  const response = await fetch(filename);
  const text = await response.text();
  const rows = text.trim().split("\n").slice(1); // skip header
  return rows.map(row => {
    const cols = row.split(";").map(col => col.trim());
    return {
      video: cols[0],
      action: cols[1] || ""
    };
  }).filter(row => row.video);
}

// Video trial: clears container on start to avoid overlapping content
function createVideoTrial(videoFile) {
  let cleanFilename = videoFile;
  if (!cleanFilename.startsWith("videos/")) {
    cleanFilename = `videos/${cleanFilename}`;
  }
  return {
    type: jsPsychVideoButtonResponse,
    stimulus: [cleanFilename],
    choices: [],
    trial_ends_after_video: true,
    prompt: "",
    response_ends_trial: false,
    on_start: function() {
      jsPsych.getDisplayElement().innerHTML = "";
    }
  };
}

// Text response trial (for Part 1)
const textResponseTrial = {
  type: jsPsychSurveyText,
  on_start: function() {
    jsPsych.getDisplayElement().innerHTML = "";
  },
  questions: [{
    prompt: "<div style='font-size:24px;'>What action was shown?</div>",
    placeholder: "Type your response here...",
    rows: 2,
    columns: 40
  }],
  button_label: "Submit"
};

// Likert trial creation (for Part 2)
function createLikertTrial(action) {
  return {
    type: jsPsychSurveyLikert,
    on_start: function() {
      jsPsych.getDisplayElement().innerHTML = "";
    },
    questions: [{
      prompt: `<div style='font-size:24px;'>How natural is this action of ${action}? (0-unnatural, 6-conpletely natural)</div>`,
      labels: ["0", "1", "2", "3", "4", "5", "6"]
    }],
    button_label: "Submit"
  };
}

// Instructions trial
const instructions = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "<div style='font-size:28px;'>Welcome to the experiment!<br>In this experiment, you will watch short videos of a person using gestures to mimic the use of different objects.<br>However, the objects themselves will not be visible.<br> Your task is simple: after watching each video, type the action you believe is being performed.<br>We will only collect your responses to the videos; no personal data will be recorded.<br>Please respond as naturally and intuitively as possible.<br>Press SPACE to start.</div>",
  choices: [' ']
};

// Practice Trial
const practiceTrial = [
  {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: "<div style='font-size:24px;'>Practice trial.<br>Watch the video and type what action is shown.<br>Press SPACE to continue.</div>",
    choices: [' ']
  },
  createVideoTrial("practice.mp4"),
  blankTrial,
  textResponseTrial,
  blankTrial,
  {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: "<div style='font-size:24px;'>The correct answer is: BRUSHING TEETH.<br>Press SPACE to continue.</div>",
    choices: [' ']
  }
];

// Main experiment function
async function runExperiment() {
  // Begin timeline with fullscreen entry and instructions
  let timeline = [enterFullscreenTrial, instructions, blankTrial];

  // Load conditions from CSV files
  let conditions_part1 = await loadCSV("pantomimes_part1.csv");
  let conditions_part2 = await loadCSV("pantomimes_part2.csv");

  // Shuffle conditions
  conditions_part1 = jsPsych.randomization.shuffle(conditions_part1);
  conditions_part2 = jsPsych.randomization.shuffle(conditions_part2);

  // Array to store responses
  let results = [];

  // Part 1: Video then text response
  let part1_trials = [];
  conditions_part1.forEach(trial => {
    part1_trials.push(createVideoTrial(trial.video));
    part1_trials.push(blankTrial);
    part1_trials.push({
      ...textResponseTrial,
      on_finish: function(data) {
        const response = data.response["Q0"];
        results.push({ trial: "Part1", video: trial.video, response: response, rating: "" });
        console.log("Part1 response recorded:", response);
      }
    });
    part1_trials.push(blankTrial);
  });

  // Part 2 introduction
  const part2_intro = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: "<div style='font-size:24px;'>In this part of the experiment, you will watch the same videos again.<br>This time, your task is to rate how natural the action looks on a scale from 0 to 6, where:<br>0 = Not natural at all; 6 = Completely natural<br>Read the names of the actions carefully.<br>There are no right or wrong answers—just rate based on your intuition.<br>Press SPACE to continue.</div>",
    choices: [' ']
  };

  // Part 2: Video then Likert rating
  let part2_trials = [];
  conditions_part2.forEach(trial => {
    console.log("Trial from CSV:", trial);
    part2_trials.push(createVideoTrial(trial.video));
    part2_trials.push(blankTrial);
    part2_trials.push({
      ...createLikertTrial(trial.action),
      on_finish: function(data) {
        const rating = data.response["Q0"];
        results.push({ trial: "Part2", video: trial.video, response: "", rating: rating });
        console.log("Part2 rating recorded:", rating);
      }
    });
    part2_trials.push(blankTrial);
  });

  // End screen trial that saves the results
  const endScreen = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: "<div style='font-size:28px;'>Thank you for your participation!<br>Press any key to exit.</div>",
    choices: "ALL_KEYS",
    on_finish: function() {
      console.log("Final results:", results);
      saveResults(results);
    }
  };

  // Build full timeline (all trials)
  timeline = timeline.concat(practiceTrial, part1_trials, part2_intro, part2_trials, endScreen, exitFullscreenTrial);

  // Run the timeline once
  jsPsych.run(timeline);
}

// Save results function: sends data to the Google Apps Script web app
function saveResults(results) {
  console.log("Saving results:", results);
  fetch('https://script.google.com/macros/s/AKfycbz3jG5kcxdtgz5rJOmrWa4YKsODZG_fWa3teNK-i1Og5znI4rzqRe31uwNQUpTHFVE/exec', {
    method: 'POST',
    mode: 'no-cors', // Use no-cors to bypass the CORS preflight
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ results: results, timestamp: Date.now() })
  })
  .then(response => {
    // With no-cors, the response is opaque and you cannot inspect its content
    console.log("Data saved, opaque response:", response);
  })
  .catch(error => {
    console.error("Error saving data:", error);
  });
}


// Start the experiment
runExperiment();
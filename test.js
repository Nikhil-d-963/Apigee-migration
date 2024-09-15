const inquirer = require('inquirer');


async function promptUser() {
  try {
    // Prompt the user with multiple questions
    const answers = await inquirer.prompt([
      {
        type: 'input',  // Default type is 'input', but it's good practice to specify it
        name: 'username',
        message: 'Enter username for GitHub:',
        validate: input => input ? true : 'Username cannot be empty',
      },
      {
        type: 'list',  // Use 'list' type for predefined options
        name: 'color',
        message: 'Choose a color (red, blue, black, orange, yellow, green, indigo, or violet) for resume:',
        choices: ['red', 'blue', 'black', 'orange', 'yellow', 'green', 'indigo', 'violet'],
        default: 'blue'  // Optional: set a default value
      }
    ]);

    // Use the user's answers
    console.log('User Input:', answers);
  } catch (error) {
    if (error.isTtyError) {
      // Prompt couldn't be rendered in the current environment
      console.error('Prompt could not be rendered.');
    } else {
      // Something else went wrong
      console.error('Error:', error.message);
    }
  }
}

// Call the function
promptUser();

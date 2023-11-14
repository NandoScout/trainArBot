import axios from 'axios';
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters'
import { sendServicesInfo, setSessionId } from './utils';
import { addUser, userStore } from './store';

// Replace 'YOUR_BOT_TOKEN' with your actual Telegram Bot API token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_DEFAULT_CHAT_ID;

// Create a new Telegraf bot instance
export const bot = new Telegraf(TELEGRAM_BOT_TOKEN as string);

export let lastUserId = 0;

// Store the current menu level for each user
const userMenuLevels: Record<number, MenuLevel> = {};


// bot.on('message',(message) => {
//     console.log('Telegram Message received:', message.text);
//     setSessionId(message.text)
// })

// bot.on('inline_query',(id, from, query, offset, chat_type, location) => {
//     console.log(query);
// })


export function sendTelegramMessage(message: string) {
    // Send a message to the Telegram chat
    if (bot) {
        bot.telegram.sendMessage(TELEGRAM_CHAT_ID as string, message);
    } else {
        const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const payload = {
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
        };
      
        axios
          .post(telegramApiUrl, payload)
          .then(() => {
            console.log('Telegram message sent successfully.');
          })
          .catch((error) => {
            console.error('Error sending Telegram message:', error.message);
          });
    }
}

// bot.onText(/\/start/, (msg) => {
//     try {
//         bot.sendMessage(msg.chat.id, 'Bienvenido al menu principal!', mainMenu)
//         //.catch(error => console.error(error));
//     } catch (error) {
//         console.error(error);
//     }
// });

// bot.onText(new RegExp(mainMenu.reply_markup.keyboard[0][0].toString()), (msg) => {
//   bot.sendMessage(msg.chat.id, 'You selected '+msg.text)
//   .catch(error => console.error(error));
//   //   bot.sendMessage(msg.chat.id, 'You selected Main Menu Option 1');
// });

// bot.onText(new RegExp(mainMenu.reply_markup.keyboard[0][1].toString()), (msg) => {
//   bot.sendMessage(msg.chat.id, 'You selected '+msg.text);
// //   bot.sendMessage(msg.chat.id, 'You selected Main Menu Option 2');
// });

// bot.onText(new RegExp(subMenu.reply_markup.keyboard[0][0].toString()), (msg) => {
//   bot.sendMessage(msg.chat.id, 'You selected '+msg.text);
// //   bot.sendMessage(msg.chat.id, 'You selected Submenu Option 1');
// });

// bot.onText(new RegExp(subMenu.reply_markup.keyboard[0][1].toString()), (msg) => {
//   bot.sendMessage(msg.chat.id, 'You selected '+msg.text);
// //   bot.sendMessage(msg.chat.id, 'You selected Submenu Option 2');
// });

// bot.onText(new RegExp(subMenu.reply_markup.keyboard[0][2].toString()), (msg) => {
//   bot.sendMessage(msg.chat.id, 'You selected '+msg.text);
// });

// // Back to Main menu
// bot.onText(new RegExp(subMenu.reply_markup.keyboard[0].slice(-1).toString()), (msg) => {
//   bot.sendMessage(msg.chat.id, 'Back to the Main Menu!', mainMenu);
// });

// bot.on('message', (msg) => {
//   const chatId = msg.chat.id;
//   const text = msg.text;

//   if (text === 'Open Submenu') {
//     bot.sendMessage(chatId, 'Welcome to the Submenu!', subMenu);
//   }
// });




// Define menu levels
enum MenuLevel {
  MAIN_MENU,
  SUBMENU_GO,
  SUBMENU_BACK,
  // Add more menu levels as needed
}

const submenu = (level: MenuLevel) => `go_${level}`;

// Create an object to store menu options and their corresponding menus
const menus: Record<MenuLevel, any> = {
  [MenuLevel.MAIN_MENU]: {
    text: `Menu Principal\nGestione su consulta de pasajes`,
    options: ['last', 'set_token', [submenu(MenuLevel.SUBMENU_GO), submenu(MenuLevel.SUBMENU_BACK)]],
    optionsText: ['Última info', 'Actualizar token', ['Ida', 'Vuelta']],
  },
  [MenuLevel.SUBMENU_GO]: {
    text: '**Menu Pasajes Ida**',
    options: [['view_go_dates','set_go_dates'], submenu(MenuLevel.MAIN_MENU)],
    optionsText: [['Ver', 'Actualizar'], 'Volver'],
  },
  [MenuLevel.SUBMENU_BACK]: {
    text: '**Menu Pasajes Vuelta**',
    options: [['view_back_dates','set_back_dates'], submenu(MenuLevel.MAIN_MENU)],
    optionsText: [['Ver', 'Actualizar'], 'Volver'],
  },
  // Add more menu levels and options as needed
};

// Middleware for /start command
bot.start((ctx) => {
  const chatId = ctx.message.chat.id;

  // Initialize the user's menu level to the main menu
  userMenuLevels[chatId] = MenuLevel.MAIN_MENU;

  // Display the main menu
  showMenu(ctx);
});
// Middleware for /menu command
bot.command('menu',(ctx) => {
  const chatId = ctx.message.chat.id;

  // Initialize the user's menu level to the main menu
  userMenuLevels[chatId] = MenuLevel.MAIN_MENU;

  // Display the main menu
  showMenu(ctx);
});

const cmdLast = (ctx: any) => {
  const chatId = ctx.message?.chat?.id || ctx.chat.id;

  sendServicesInfo(userStore[chatId]?.lastInfo, `Ultima info:\n`, '', true)
}

// Middleware for /last command
bot.command('last',(ctx) => {
  cmdLast(ctx)
});

bot.command('token', async (ctx) => {
    if (ctx.payload?.length) {
        lastUserId = ctx.chat.id
        console.log('Chat:',ctx.chat.id,'Token recibido:',ctx.payload);
        setSessionId(ctx.payload)
        .then(t => {
          if (!userStore[lastUserId]) { addUser({id: lastUserId, token: t as string }) }
          ctx.reply(`Token guardado`)
        })
        .catch(error => 
            ctx.reply(error.toString() || 'Token invalido')
        )
    }
})

bot.command('quit', async (ctx) => {
  // Explicit usage
//   await ctx.telegram.leaveChat(ctx.message.chat.id)

  // Using context shortcut
  ctx.leaveChat()
  .then(t => console.log('Chat finalizado con '+(ctx.chat as any).first_name))
  .catch(error => ctx.reply(error.toString()))
})

// Middleware for handling text messages
// bot.on('text', (ctx) => {
//   const chatId = ctx.message.chat.id;
//   const text = ctx.message.text;

//   // Get the user's current menu level
//   const currentMenuLevel = userMenuLevels[chatId];

//   // Handle user input based on the current menu level
//   switch (currentMenuLevel) {
//     case MenuLevel.MAIN_MENU:
//       handleMainMenuInput(chatId, ctx, text);
//       break;
//     case MenuLevel.SUBMENU_1:
//       handleSubmenu1Input(chatId, ctx, text);
//       break;
//     case MenuLevel.SUBMENU_2:
//       handleSubmenu2Input(chatId, ctx, text);
//       break;
//     // Add more cases for additional menu levels
//   }
// });

// Helper function to display the current menu for a user
function showMenu(ctx) {
  const chatId = ctx.chat?.id || 0;
  const currentMenuLevel = userMenuLevels[chatId];
  const menu = menus[currentMenuLevel];

  if (menu) {
    const keyboard = {
        parse_mode: 'HTML',
        reply_markup: {
            remove_keyboard: true,
            inline_keyboard: menu.options
            .map((o1,idx1) => (Array.isArray(o1) ? o1 : [o1])
              .map((o2,idx2) => {
                let optionText = (menu.optionsText) ? (Array.isArray(o1) ? menu.optionsText[idx1][idx2] : menu.optionsText[idx1]) : o2;
                if (!optionText && typeof o2 === 'string') optionText = o2;
                return typeof o2=== 'object' ? o2 : {text: optionText, callback_data: o2} 
              }
              )
            ),
            resize_keyboard: true,
            one_time_keyboard: false,
        }
    };

    if (ctx.callbackQuery) {
        ctx.editMessageText(menu.text, keyboard)
        .catch(error => ctx.reply(error.toString()))
        // ctx.editMessageReplyMarkup(keyboard.reply_markup);
        // ctx.answerCbQuery(menu.text, keyboard);
    } else {
        ctx.reply(menu.text, keyboard)
        .catch(error => ctx.reply(error.toString()))
    }
  }
}

// Helper functions to handle user input for each menu level
function handleMenuNavigation(ctx) {
    const chatId = ctx.chat?.id || 0;
    const option = ctx.callbackQuery.data.split('_')
    if (option[0] === 'go') {
        userMenuLevels[chatId] = option[1] as MenuLevel;
        showMenu(ctx);
        return true;
    }
    return false;
}
function handleMainMenuInput(ctx) {
    const chatId = ctx.chat?.id || 0;
    const option = ctx.callbackQuery;
    // Handle other options in the main menu
    switch (option.data) {
      case 'last':
        cmdLast(ctx)
        break;
    
      default:
        ctx.answerCbQuery(`You selected: ${option.data}`)
        .catch(error => ctx.reply(error.toString()))
        break;
    }
}

function handleSubmenu1Input(ctx) {
    const chatId = ctx.chat?.id || 0;
    const option = ctx.callbackQuery;
    // Handle other options in submenu 1
    ctx.answerCbQuery(`You selected: ${option.data}`)
    .catch(error => ctx.reply(error.toString()))
}

function handleSubmenu2Input(ctx) {
    const chatId = ctx.chat?.id || 0;
    const option = ctx.callbackQuery;
    // Handle other options in submenu 2
    ctx.answerCbQuery(`You selected: ${option.data}`)
    .catch(error => ctx.reply(error.toString()))
}

bot.on(message('text'), async (ctx) => {
  // Explicit usage
//   await ctx.telegram.sendMessage(ctx.message.chat.id, `Hello ${ctx.state.role}`)

  // Using context shortcut
 ctx.reply(`Hello ${(ctx?.chat as any)?.first_name}`)
 .catch(error => ctx.reply(error.toString()))
})

bot.on('callback_query', async (ctx) => {
  // Explicit usage
//   await ctx.telegram.answerCbQuery(ctx.callbackQuery.id)
  
  const chatId = ctx.chat?.id || 0;

  // Get the user's current menu level
  const currentMenuLevel = userMenuLevels[chatId];

  // Handle user input based on the current menu level
  if (!handleMenuNavigation(ctx)) {
      switch (currentMenuLevel) {
        case MenuLevel.MAIN_MENU:
          handleMainMenuInput(ctx);
          break;
        case MenuLevel.SUBMENU_GO:
          handleSubmenu1Input(ctx);
          break;
        case MenuLevel.SUBMENU_BACK:
          handleSubmenu2Input(ctx);
          break;
        // Add more cases for additional menu levels
      }
  }

  // Using context shortcut
  ctx.answerCbQuery()
  .catch(error => ctx.reply(error.toString()))
})

bot.on('inline_query', async (ctx) => {
  const result = []
  // Explicit usage
//   await ctx.telegram.answerInlineQuery(ctx.inlineQuery.id, result)

  // Using context shortcut
  ctx.answerInlineQuery(result)
  .catch(error => ctx.reply(error.toString()))
})
// Start the bot
bot.launch().then(() => {
  console.log('Bot is running');
});
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

export default bot;
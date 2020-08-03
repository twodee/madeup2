from pygments.lexer import RegexLexer
from pygments.token import *

class MadeupLexer(RegexLexer):
  name = 'Madeup'
  aliases = 'madeup'
  filenames = ['*.mup']

  tokens = {
    'root': [
      (r'\d+', Number),
      (r'[-+*/%=()]', Operator),
      (r'(repeat|around|for|to|by|through|while)', Keyword),
      (r'[a-zA-z][a-zA-Z0-9_]*', Name),
      (r',', Text),
      (r' +', Text),
    ]
  }

# https://pygments.org/docs/tokens/
# https://pygments.org/docs/lexerdevelopment/

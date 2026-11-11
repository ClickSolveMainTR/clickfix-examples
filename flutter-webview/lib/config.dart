// Values come from --dart-define (see .env.example).
import 'package:clickfix_webview/clickfix_webview.dart';

const String widgetId = String.fromEnvironment(
  'CLICKFIX_WIDGET_ID',
  defaultValue: 'WIDGET_ID',
);
const String clickFixOrigin = String.fromEnvironment(
  'CLICKFIX_ORIGIN',
  defaultValue: defaultClickFixOrigin,
);
const String apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://10.0.2.2:3000',
);
const String conversationToOpen = String.fromEnvironment(
  'CLICKFIX_CONVERSATION',
);

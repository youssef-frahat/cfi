import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/broker_provider.dart';
import 'views/broker_console_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CFIReportApp());
}

class CFIReportApp extends StatelessWidget {
  const CFIReportApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => BrokerProvider()),
      ],
      child: MaterialApp(
        title: 'CFI Record | EGX Voice-to-Order HITL Console',
        debugShowCheckedModeBanner: false,
        themeMode: ThemeMode.dark,
        theme: ThemeData(
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xFF131722),
          primaryColor: const Color(0xFF00E676),
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF00E676),
            secondary: Color(0xFF29B6F6),
            surface: Color(0xFF1E222D),
          ),
          fontFamily: 'Segoe UI',
          useMaterial3: true,
        ),
        home: const BrokerConsoleScreen(),
      ),
    );
  }
}

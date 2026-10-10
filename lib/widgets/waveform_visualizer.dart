import 'package:flutter/material.dart';

class WaveformVisualizer extends StatelessWidget {
  final List<double> peaks;
  final double currentSeconds;
  final int totalSeconds;
  final ValueChanged<double> onSeek;

  const WaveformVisualizer({
    super.key,
    required this.peaks,
    required this.currentSeconds,
    required this.totalSeconds,
    required this.onSeek,
  });

  String _formatTime(double sec) {
    final s = sec.toInt();
    final m = s ~/ 60;
    final r = s % 60;
    return '${m.toString().padLeft(2, '0')}:${r.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final progressRatio = totalSeconds > 0 ? (currentSeconds / totalSeconds).clamp(0.0, 1.0) : 0.0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF131722),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF2A2E39)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _formatTime(currentSeconds),
                style: const TextStyle(
                  color: Color(0xFF00E676),
                  fontWeight: FontWeight.bold,
                  fontFamily: 'monospace',
                  fontSize: 13,
                ),
              ),
              const Row(
                children: [
                  Icon(Icons.mic, size: 14, color: Colors.white70),
                  SizedBox(width: 4),
                  Text(
                    'تسجيل المكالمة الهاتفية (PBX Audio Stream)',
                    style: TextStyle(color: Colors.white70, fontSize: 11),
                  ),
                ],
              ),
              Text(
                _formatTime(totalSeconds.toDouble()),
                style: const TextStyle(
                  color: Colors.white38,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'monospace',
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Interactive Waveform Bars
          SizedBox(
            height: 48,
            child: LayoutBuilder(
              builder: (context, constraints) {
                final barCount = peaks.isNotEmpty ? peaks.length : 40;
                final barWidth = (constraints.maxWidth / barCount) - 2;

                return GestureDetector(
                  onTapDown: (details) {
                    final ratio = (details.localPosition.dx / constraints.maxWidth).clamp(0.0, 1.0);
                    onSeek(ratio * totalSeconds);
                  },
                  onHorizontalDragUpdate: (details) {
                    final ratio = (details.localPosition.dx / constraints.maxWidth).clamp(0.0, 1.0);
                    onSeek(ratio * totalSeconds);
                  },
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: List.generate(barCount, (index) {
                      final peak = peaks.isNotEmpty ? peaks[index % peaks.length] : 0.5;
                      final barRatio = index / barCount;
                      final isPlayed = barRatio <= progressRatio;

                      return Container(
                        width: barWidth > 1 ? barWidth : 1.5,
                        height: 48 * peak,
                        decoration: BoxDecoration(
                          color: isPlayed ? const Color(0xFF00E676) : const Color(0xFF363C4E),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      );
                    }),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

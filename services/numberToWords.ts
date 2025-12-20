
export function numberToWords(num: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToWords = (input: number): string => {
    if (input === 0) return '';
    if (input < 20) return a[input];
    if (input < 100) return b[Math.floor(input / 10)] + (input % 10 !== 0 ? ' ' + a[input % 10] : '');
    if (input < 1000) return a[Math.floor(input / 100)] + 'Hundred ' + numToWords(input % 100);
    if (input < 100000) return numToWords(Math.floor(input / 1000)) + 'Thousand ' + numToWords(input % 1000);
    if (input < 10000000) return numToWords(Math.floor(input / 100000)) + 'Lakh ' + numToWords(input % 100000);
    return numToWords(Math.floor(input / 10000000)) + 'Crore ' + numToWords(input % 10000000);
  };

  const [whole, fraction] = num.toString().split('.');
  
  let output = numToWords(Number(whole));
  
  if (fraction && Number(fraction) > 0) {
      const paisa = fraction.padEnd(2, '0').slice(0, 2);
      output += 'and ' + numToWords(Number(paisa)) + 'Paisa ';
  }

  return output.trim() + ' Only';
}
